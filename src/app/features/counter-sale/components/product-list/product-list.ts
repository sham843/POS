import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
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

  // Products loaded from IndexedDB using signals
  allProducts = signal<any[]>([]);
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

  @HostListener('window:resize')
  onResize() {
    this.updateCategoriesOverflow();
  }

  // Reactive filtered products computed signal
  filteredProducts = computed(() => {
    const products = this.allProducts(); // variants
    const categories = this.allCategories(); // parent products
    const category = this.activeCategory();
    const query = this.counterSaleService.searchQuery().toLowerCase().trim();

    let filtered = products;

    // Filter by Category
    if (category !== 'All') {
      filtered = filtered.filter(p => {
        const cat = p.categoryName || p.category || p.materialGroupName;
        return cat === category;
      });
    }

    // Filter by Search Query (matching parent products in categories store)
    if (query) {
      const matchingProductIds = new Set(
        categories
          .filter(c => {
            const prodName = (c.productName || c.name || '').toLowerCase();
            const prodCode = (c.productCode || c.code || c.materialCode || '').toLowerCase();
            return prodName.includes(query) || prodCode.includes(query);
          })
          .map(c => c.id)
      );

      filtered = filtered.filter(p => {
        const matchesParent = p.productId && matchingProductIds.has(p.productId);
        const name = (p.productName || p.materialName || p.name || '').toLowerCase();
        const code = (p.productCode || p.code || p.materialCode || '').toLowerCase();
        return matchesParent || name.includes(query) || code.includes(query);
      });
    }

    return filtered;
  });

  // Reactive paginated products computed signal
  paginatedProducts = computed(() => {
    const products = this.filteredProducts();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return products.slice(start, end);
  });

  async ngOnInit() {
    await this.loadProducts();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateCategoriesOverflow();
    }, 100);
  }

  async loadProducts() {
    try {
      const products = await this.dbService.products.toArray();
      const loadedProducts = products || [];
      this.allProducts.set(loadedProducts);

      // Load categories from Db categories table, fallback to extraction if empty
      const dbCategories = await this.dbService.categories.toArray();
      this.allCategories.set(dbCategories || []);

      if (dbCategories && dbCategories.length > 0) {
        const uniqueCategories = Array.from(
          new Set(
            dbCategories
              .map(cat => cat.productName)
              .filter(Boolean)
          )
        );
        if (uniqueCategories.length > 0) {
          this.categories.set(uniqueCategories.map(name => ({ name: String(name) })));
        }
      } else if (loadedProducts.length > 0) {
        const uniqueCategories = Array.from(
          new Set(
            loadedProducts
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
      console.error('Failed to load products from IndexedDB:', error);
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
}
