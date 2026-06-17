import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule, Trash2, Package, Minus, Plus } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    MatTabsModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    EmptyState,
    FormsModule
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  counterSaleService = inject(CounterSaleService);
  
  displayedColumns: string[] = ['details', 'quantity', 'rate', 'discount', 'amount', 'gst', 'total'];
  
  // Data source for the table uses the shared cart state
  dataSource = this.counterSaleService.cartItems;

  // Expose icons to template
  readonly Trash2 = Trash2;
  readonly Package = Package;
  readonly Minus = Minus;
  readonly Plus = Plus;

  updateQuantity(index: number, currentQty: number, change: number) {
    this.counterSaleService.updateQuantity(index, currentQty + change);
  }

  onDiscountChange(index: number, event: any) {
    const val = parseFloat(event.target.value) || 0;
    this.counterSaleService.updateDiscount(index, val);
  }

  removeItem(index: number) {
    this.counterSaleService.removeItem(index);
  }

  clearCart() {
    this.counterSaleService.clearCart();
  }
}
