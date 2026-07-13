import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, AfterViewInit, inject, signal, computed, ViewChild, ElementRef, HostListener, ChangeDetectionStrategy, effect } from '@angular/core';
import { LucideAngularModule, Package, Ellipsis, Star, Search, PlusCircle, CheckCircle, ArrowUp } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DbService } from '../../../../core/services/db.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { CounterSaleService, Product } from '../../../../core/services/counter-sale.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatButtonModule,
    MatMenuModule,
    MatPaginatorModule,
    EmptyState,
    NgOptimizedImage
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList implements OnInit, AfterViewInit {
  private dbService = inject(DbService);
  private counterSaleService = inject(CounterSaleService);

  // Container ref for available width measurement
  @ViewChild('pillsContainer', { static: false }) pillsContainer!: ElementRef<HTMLDivElement>;
  // Hidden measurement container — renders all buttons invisibly to get real widths
  @ViewChild('measureContainer', { static: false }) measureContainer!: ElementRef<HTMLDivElement>;

  // Expose icons to template
  readonly Package = Package;
  readonly Ellipsis = Ellipsis;
  readonly Star = Star;
  readonly Search = Search;
  readonly PlusCircle = PlusCircle;
  readonly CheckCircle = CheckCircle;
  readonly ArrowUp = ArrowUp;

  sessionBillStats = this.counterSaleService.sessionBillStats;

  // Paginated products and count signals
  paginatedProducts = signal<any[]>([]);
  totalFilteredProductsCount = signal<number>(0);

  allCategories = signal<any[]>([]);
  activeCategory = signal<string>('All');
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // All categories in DB order
  categories = signal<{ name: string }[]>([]);
  // Visible pills (fit in container width)
  visibleCategories = signal<{ name: string }[]>([]);
  // Overflow categories (shown inside More menu)
  overflowCategories = signal<{ name: string }[]>([]);
  // Search inside More menu
  menuSearchQuery = signal<string>('');

  stockFilter = signal<'all' | 'in-stock' | 'out-of-stock'>('all');

  filteredOverflowCategories = computed(() => {
    const query = this.menuSearchQuery().toLowerCase().trim();
    const overflow = this.overflowCategories();
    if (!query) return overflow;
    return overflow.filter(cat => cat.name.toLowerCase().includes(query));
  });

  // More button becomes active when selected category is in overflow
  isOverflowActive = computed(() => {
    const active = this.activeCategory();
    return this.overflowCategories().some(cat => cat.name === active);
  });

  constructor() {
    // Reactively fetch products from IndexedDB whenever query, page, size, or category changes.
    effect(() => {
      const category = this.activeCategory();
      const searchType = this.counterSaleService.searchType();
      const query = searchType === 'product' ? this.counterSaleService.searchQuery() : '';
      const page = this.currentPage();
      const size = this.pageSize();
      const activeCats = this.allCategories();

      this.fetchPaginatedProducts(category, query, page, size, activeCats);
    }, { allowSignalWrites: true });
  }

  // Debounce timer to avoid heavy DOM queries on every resize pixel
  private resizeTimer: any;

  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.updateCategoriesOverflow(), 150);
  }

  ngAfterViewInit() {
    // After first render, measure actual button widths and split visible/overflow
    setTimeout(() => this.updateCategoriesOverflow(), 0);
  }

  async fetchPaginatedProducts(category: string, query: string, page: number, size: number, activeCats: any[]) {
    const queryLower = query.toLowerCase().trim();
    const categoryLower = category.toLowerCase().trim();

    try {
      let filtered: any[];
      if (category === 'All' && !queryLower) {
        // Fast path: Load count and only the slice we need from IndexedDB
        const total = await this.dbService.products.count();
        this.totalFilteredProductsCount.set(total);

        filtered = await this.dbService.products
          .offset((page - 1) * size)
          .limit(size)
          .toArray();
      } else {
        // Filter path: Retrieve and filter items
        let matchingCategoryIds: Set<number> | null = null;
        if (category !== 'All') {
          matchingCategoryIds = new Set(
            activeCats
              .filter(c => (c.productName || c.name || '').toLowerCase() === categoryLower)
              .map(c => c.id)
          );
        }

        let matchingProductIds: Set<number> | null = null;
        if (queryLower) {
          matchingProductIds = new Set(
            activeCats
              .filter(c => {
                const prodName = (c.productName || c.name || '').toLowerCase();
                const prodCode = (c.productCode || c.code || c.materialCode || '').toLowerCase();
                return prodName.includes(queryLower) || prodCode.includes(queryLower);
              })
              .map(c => c.id)
          );
        }

        const allFiltered = await this.dbService.products.filter(p => {
          // Filter by Category
          if (category !== 'All' && matchingCategoryIds) {
            const matchesParent = p.productId && matchingCategoryIds.has(p.productId);
            const cat = (p.categoryName || p.category || p.materialGroupName || '').toLowerCase();
            const matName = (p.materialName || p.productName || p.name || '').toLowerCase();
            if (!(matchesParent || cat === categoryLower || matName.includes(categoryLower))) {
              return false;
            }
          }
          // Filter by Search Query
          if (queryLower && matchingProductIds) {
            const matchesParent = p.productId && matchingProductIds.has(p.productId);
            const name = (p.productName || p.materialName || p.name || '').toLowerCase();
            const code = (p.productCode || p.code || p.materialCode || '').toLowerCase();
            if (!(matchesParent || name.includes(queryLower) || code.includes(queryLower))) {
              return false;
            }
          }
          return true;
        }).toArray();

        this.totalFilteredProductsCount.set(allFiltered.length);
        const start = (page - 1) * size;
        filtered = allFiltered.slice(start, start + size);
      }

      this.paginatedProducts.set(filtered);
    } catch (err) {
      console.error('Error fetching paginated products from IndexedDB:', err);
    }
  }

  async ngOnInit() {
    await this.loadCategoriesAndInitialProducts();
  }

  async loadCategoriesAndInitialProducts() {
    try {
      // orderBy('id') ensures categories appear in the same sequence they were inserted in DB
      const dbCategories = await this.dbService.categories.orderBy('id').toArray();
      const loadedCategories = dbCategories || [];
      this.allCategories.set(loadedCategories);

      if (loadedCategories.length > 0) {
        // Direct map — preserve exact DB order, no Set() reordering
        const categoryItems = loadedCategories
          .filter(cat => cat.productName)
          .map(cat => ({ name: String(cat.productName) }));
        if (categoryItems.length > 0) {
          this.categories.set(categoryItems);
          // Set all visible initially; updateCategoriesOverflow runs after DOM renders
          this.visibleCategories.set(categoryItems);
          this.overflowCategories.set([]);
          // Measure after one render tick so hidden container has actual widths
          setTimeout(() => this.updateCategoriesOverflow(), 0);
        }
      } else {
        // Fallback: scan first 100 products to extract categories
        const sampleProducts = await this.dbService.products.orderBy('id').limit(100).toArray();
        const uniqueCategories = Array.from(
          new Set(
            sampleProducts
              .map(p => p.categoryName || p.category || p.materialGroupName)
              .filter(Boolean)
          )
        );
        if (uniqueCategories.length > 0) {
          const items = uniqueCategories.map(name => ({ name: String(name) }));
          this.categories.set(items);
          this.visibleCategories.set(items);
          this.overflowCategories.set([]);
          setTimeout(() => this.updateCategoriesOverflow(), 0);
        }
      }
    } catch (error) {
      console.error('Failed to load categories from IndexedDB:', error);
    }
  }

  /**
   * Uses the hidden #measureContainer (which renders all buttons at full width)
   * to get actual offsetWidth of each button — works correctly for Marathi/Unicode text.
   * Then splits into visible/overflow based on #pillsContainer clientWidth.
   */
  updateCategoriesOverflow() {
    if (!this.pillsContainer || !this.measureContainer) return;

    const allCats = this.categories();
    if (allCats.length === 0) return;

    const containerWidth = this.pillsContainer.nativeElement.clientWidth;
    if (!containerWidth) return;

    // Measure actual widths from the hidden container
    const measureBtns = Array.from(
      this.measureContainer.nativeElement.querySelectorAll('.pill-btn-measure')
    ) as HTMLElement[];

    if (measureBtns.length !== allCats.length) {
      // DOM not ready yet, retry
      setTimeout(() => this.updateCategoriesOverflow(), 50);
      return;
    }

    const GAP = 6;
    const MORE_BTN_WIDTH = 96; // width reserved for the "More" button
    const availableWidth = containerWidth - MORE_BTN_WIDTH;

    let currentWidth = 0;
    let splitIndex = allCats.length; // assume all fit

    for (let i = 0; i < measureBtns.length; i++) {
      currentWidth += measureBtns[i].offsetWidth + GAP;
      if (currentWidth > availableWidth) {
        splitIndex = i;
        break;
      }
    }

    if (splitIndex === allCats.length) {
      // All fit — no More button needed
      this.visibleCategories.set(allCats);
      this.overflowCategories.set([]);
    } else {
      this.visibleCategories.set(allCats.slice(0, splitIndex));
      this.overflowCategories.set(allCats.slice(splitIndex));
    }
  }

  onMenuSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.menuSearchQuery.set(input.value);
  }

  clearMenuSearch() {
    this.menuSearchQuery.set('');
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  selectCategory(name: string) {
    this.activeCategory.set(name);
    this.currentPage.set(1);
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
  }

  getShortBillNo(billNo: string): string {
    if (!billNo) return '';
    return billNo.split('/')[0];
  }

  loadPreviousBill(billNo: string) {
    if (billNo) {
      const cleanBillNo = this.getShortBillNo(billNo);
      this.counterSaleService.loadInvoiceByBillNo(cleanBillNo);
    }
  }

  addToCart(product: Product) {
    this.counterSaleService.addToCart(product);
  }

  cartProductIds = computed(() => {
    const items = this.counterSaleService.cartItems();
    const ids = new Set<string | number>();
    for (const item of items) {
      if (item.product?.id) ids.add(item.product.id);
      if (item.product?.productCode) ids.add(item.product.productCode);
      if (item.details) ids.add(item.details);
    }
    return ids;
  });

  isInCart(product: Product): boolean {
    const ids = this.cartProductIds();
    return (
      (product.id && ids.has(product.id)) ||
      (product.productCode && ids.has(product.productCode)) ||
      (product.productName && ids.has(product.productName)) ||
      (product.materialName && ids.has(product.materialName)) ||
      (product.name && ids.has(product.name)) || false
    );
  }

  getStockFilterLabel(): string {
    const filter = this.stockFilter();
    if (filter === 'in-stock') return 'In';
    if (filter === 'out-of-stock') return 'Out';
    return 'In/Out';
  }

  setStockFilter(filter: 'all' | 'in-stock' | 'out-of-stock') {
    this.stockFilter.set(filter);
    this.currentPage.set(1);
  }

  getStockStatus(p: any): 'in-stock' | 'out-of-stock' {
    let stock = p.availableStock;

    // Fallback to stockQty if availableStock is missing or null
    if (stock === undefined || stock === null || stock === '') {
      stock = p.stockQty;
    }

    // If both are missing/null, assume in-stock (default behavior)
    if (stock === undefined || stock === null || stock === '') {
      return 'in-stock';
    }

    const isAvailable = Number(stock) >= 0;
    return isAvailable ? 'in-stock' : 'out-of-stock';
  }

}
