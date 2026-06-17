import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule, Trash2, Package, Minus, Plus } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

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
  snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['details', 'quantity', 'rate', 'discount', 'amount', 'gst', 'total'];

  // Data source for the table uses the shared cart state
  dataSource = this.counterSaleService.cartItems;

  // Expose icons to template
  readonly Trash2 = Trash2;
  readonly Package = Package;
  readonly Minus = Minus;
  readonly Plus = Plus;

  trackByIdx(index: number, _item: any): number {
    return index;
  }

  updateQuantity(index: number, currentQty: number, change: number) {
    this.counterSaleService.updateQuantity(index, currentQty + change);
  }

  onDiscountChange(index: number, event: any) {
    let val = parseFloat(event.target.value) || 0;
    val = parseFloat(val.toFixed(2));
    if (val > environment.maxDiscount) {
      val = environment.maxDiscount;
      event.target.value = environment.maxDiscount.toString();
      this.snackBar.open(`Discount cannot exceed ${environment.maxDiscount}%`, 'Close', { 
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } else {
      event.target.value = val > 0 ? val.toString() : '';
    }
    this.counterSaleService.updateDiscount(index, val);
  }

  onAmountChange(index: number, event: any) {
    let val = parseFloat(event.target.value) || 0;
    val = parseFloat(val.toFixed(2));
    event.target.value = val.toString();
    this.counterSaleService.updateAmount(index, val);
  }

  removeItem(index: number) {
    this.counterSaleService.removeItem(index);
  }

  clearCart() {
    this.counterSaleService.clearCart();
  }
}
