import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, inject, signal, computed, ViewChild, ElementRef, HostListener, ChangeDetectionStrategy, effect } from '@angular/core';
import { LucideAngularModule, LayoutGrid, Package, Ellipsis, Star, ChevronLeft, ChevronRight, Search } from 'lucide-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DbService } from '../../../../core/services/db.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatCardModule,
    MatButtonModule,
    MatMenuModule,
    MatPaginatorModule,
    EmptyState
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList implements OnInit, AfterViewInit {
  private dbService = inject(DbService);
  private counterSaleService = inject(CounterSaleService);

  @ViewChild('pillsContainer', { static: false }) pillsContainer!: ElementRef<HTMLDivElement>;

  // Expose icons to template
  readonly LayoutGrid = LayoutGrid;
  readonly Package = Package;
  readonly Ellipsis = Ellipsis;
  readonly Star = Star;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Search = Search;

  // Paginated products and count signals
  paginatedProducts = signal<any[]>([]);
  totalFilteredProductsCount = signal<number>(0);

  allCategories = signal<any[]>([]);
  activeCategory = signal<string>('All');
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // Dynamic Categories (fallback to hardcoded if DB is empty)
  categories = signal<{ name: string }[]>([]);
  visibleCategories = signal<{ name: string }[]>([]);
  overflowCategories = signal<{ name: string }[]>([]);
  menuSearchQuery = signal<string>('');

  filteredOverflowCategories = computed(() => {
    const query = this.menuSearchQuery().toLowerCase().trim();
    const overflow = this.overflowCategories();
    if (!query) return overflow;
    return overflow.filter(cat => cat.name.toLowerCase().includes(query));
  });

  isOverflowActive = computed(() => {
    const active = this.activeCategory();
    return this.overflowCategories().some(cat => cat.name === active);
  });

  constructor() {
    // Reactively fetch products from IndexedDB whenever query, page, size, or category changes.
    effect(() => {
      const category = this.activeCategory();
      const query = this.counterSaleService.searchQuery();
      const page = this.currentPage();
      const size = this.pageSize();
      const activeCats = this.allCategories(); // React to categories load

      this.fetchPaginatedProducts(category, query, page, size, activeCats);
    }, { allowSignalWrites: true });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateCategoriesOverflow();
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

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateCategoriesOverflow();
    }, 100);
  }

  async loadCategoriesAndInitialProducts() {
    try {
      // Load categories from Db categories table, fallback to extraction if empty
      const dbCategories = await this.dbService.categories.toArray();
      const loadedCategories = dbCategories || [];
      this.allCategories.set(loadedCategories);

      if (loadedCategories.length > 0) {
        const uniqueCategories = Array.from(
          new Set(
            loadedCategories
              .map(cat => cat.productName)
              .filter(Boolean)
          )
        );
        if (uniqueCategories.length > 0) {
          this.categories.set(uniqueCategories.map(name => ({ name: String(name) })));
        }
      } else {
        // Fallback: If category table is empty, do a light scan of first few products to extract categories
        const sampleProducts = await this.dbService.products.limit(100).toArray();
        const uniqueCategories = Array.from(
          new Set(
            sampleProducts
              .map(p => p.categoryName || p.category || p.materialGroupName)
              .filter(Boolean)
          )
        );
        if (uniqueCategories.length > 0) {
          this.categories.set(uniqueCategories.map(name => ({ name: String(name) })));
        }
      }

      this.updateCategoriesOverflow();
    } catch (error) {
      console.error('Failed to load categories from IndexedDB:', error);
    }
  }

  updateCategoriesOverflow() {
    if (!this.pillsContainer) {
      this.visibleCategories.set(this.categories());
      this.overflowCategories.set([]);
      return;
    }

    const containerWidth = this.pillsContainer.nativeElement.clientWidth;
    const allCats = this.categories();

    if (!containerWidth || allCats.length === 0) {
      this.visibleCategories.set(allCats);
      this.overflowCategories.set([]);
      return;
    }

    let totalEstWidth = 0;
    for (const cat of allCats) {
      totalEstWidth += (51 + cat.name.length * 9.5 + 6);
    }

    if (totalEstWidth <= containerWidth) {
      this.visibleCategories.set(allCats);
      this.overflowCategories.set([]);
      return;
    }

    const availableWidth = containerWidth - 96;
    let currentWidth = 0;
    const visible: any[] = [];
    const overflow: any[] = [];

    for (const cat of allCats) {
      const estWidth = 51 + cat.name.length * 9.5 + 6;
      if (currentWidth + estWidth < availableWidth) {
        visible.push(cat);
        currentWidth += estWidth;
      } else {
        overflow.push(cat);
      }
    }

    if (visible.length === 0 && allCats.length > 0) {
      visible.push(allCats[0]);
      overflow.shift();
    }

    this.visibleCategories.set(visible);
    this.overflowCategories.set(overflow);
  }

  onMenuSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.menuSearchQuery.set(input.value);
  }

  selectCategory(name: string) {
    this.activeCategory.set(name);
    this.currentPage.set(1);
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
  }

  clearMenuSearch() {
    this.menuSearchQuery.set('');
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
