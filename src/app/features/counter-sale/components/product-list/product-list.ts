import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { LucideAngularModule, LayoutGrid, Package, Ellipsis, Star, ChevronLeft, ChevronRight } from 'lucide-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
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
    MatPaginatorModule,
    EmptyState
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit {
  private dbService = inject(DbService);
  private counterSaleService = inject(CounterSaleService);

  // Expose icons to template
  readonly LayoutGrid = LayoutGrid;
  readonly Package = Package;
  readonly Ellipsis = Ellipsis;
  readonly Star = Star;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  // Products loaded from IndexedDB using signals
  allProducts = signal<any[]>([]);
  activeCategory = signal<string>('All');
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // Dynamic Categories (fallback to hardcoded if DB is empty)
  categories = signal<{ name: string }[]>([
    { name: 'Milk' },
    { name: 'Paneer' },
    { name: 'Ghee' },
    { name: 'Khava' },
    { name: 'Lassi' }
  ]);

  // Reactive filtered products computed signal
  filteredProducts = computed(() => {
    const products = this.allProducts();
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

    // Filter by Search Query
    if (query) {
      filtered = filtered.filter(p => {
        const name = (p.productName || p.materialName || p.name || '').toLowerCase();
        const code = (p.productCode || p.code || p.materialCode || '').toLowerCase();
        return name.includes(query) || code.includes(query);
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

  async loadProducts() {
    try {
      const products = await this.dbService.variantList.toArray();
      const loadedProducts = products || [];
      this.allProducts.set(loadedProducts);
      
      // Dynamically extract categories if products exist
      if (loadedProducts.length > 0) {
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
    } catch (error) {
      console.error('Failed to load products from IndexedDB:', error);
    }
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
