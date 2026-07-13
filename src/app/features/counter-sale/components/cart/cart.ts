import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, effect, ElementRef } from '@angular/core';
import { LucideAngularModule, Trash2, Package, Minus, Plus, Calendar } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../../core/services/notification.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cart {
  counterSaleService = inject(CounterSaleService);
  notificationService = inject(NotificationService);
  private el = inject(ElementRef);

  loadedOrder = this.counterSaleService.loadedOrder;

  get loadedOrderDate(): string {
    debugger
    const order = this.loadedOrder();
    if (!order) return '';
    return order.orderDate || order.deliveryDate || order.createdDate || order.date || '';
  }

  get discountPlaceholder(): string {
    const posSettingsStr = localStorage.getItem('posSettings');
    let discountType = 'percent';
    if (posSettingsStr) {
      try {
        const settings = JSON.parse(posSettingsStr);
        if (settings.discountType === 'amount') discountType = 'amount';
      } catch (e) { }
    }
    return discountType === 'amount' ? 'Disc ₹' : 'Disc %';
  }

  displayedColumns: string[] = ['details', 'quantity', 'rate', 'discount', 'amount', 'gst', 'total'];

  // Data source for the table uses the shared cart state
  dataSource = this.counterSaleService.cartItems;

  constructor() {
    effect(() => {
      const selectedIndex = this.counterSaleService.selectedItemIndex();
      if (selectedIndex !== null) {
        setTimeout(() => {
          const container = this.el.nativeElement.querySelector('.cart-items-list');
          if (container) {
            if (selectedIndex === this.dataSource().length - 1) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            } else {
              const selectedElement = container.querySelector('.cart-item.selected');
              if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          }
        }, 100);
      }
    });
  }


  // Expose icons to template
  readonly Trash2 = Trash2;
  readonly Package = Package;
  readonly Minus = Minus;
  readonly Plus = Plus;
  readonly Calendar = Calendar;

  trackByIdx(index: number, _item: any): number {
    return index;
  }

  updateQuantity(index: number, currentQty: number, change: number) {
    this.counterSaleService.updateQuantity(index, currentQty + change);
  }

  onQuantityChange(index: number, event: any) {
    const item = this.counterSaleService.cartItems()[index];
    const originalVal = parseFloat(event.target.value) || 0;
    let val = originalVal;

    if (item?.product?.mensurationUnit === 'Nos') {
      val = Math.round(val);
      event.target.value = val.toString();
      if (val !== originalVal) {
        this.notificationService.showError(`Decimal values are not allowed for 'Nos'. Quantity changed to ${val}.`);
      }
    }

    if (val >= 0) {
      this.counterSaleService.updateQuantity(index, val);
    }
  }

  onDiscountChange(index: number, event: any) {
    let val = parseFloat(event.target.value) || 0;
    val = parseFloat(val.toFixed(2));

    const posSettingsStr = localStorage.getItem('posSettings');
    let discountType = 'percent';
    if (posSettingsStr) {
      try {
        const settings = JSON.parse(posSettingsStr);
        if (settings.discountType === 'amount') discountType = 'amount';
      } catch (e) { }
    }

    if (discountType !== 'amount' && val > environment.maxDiscount) {
      val = environment.maxDiscount;
      event.target.value = environment.maxDiscount.toString();
      this.notificationService.showError(`Discount cannot exceed ${environment.maxDiscount}%`);
    } else {
      event.target.value = val > 0 ? val.toString() : '';
    }
    this.counterSaleService.updateDiscount(index, val);
  }

  onAmountChange(index: number, event: any) {
    const item = this.counterSaleService.cartItems()[index];
    if (item.product?.mensurationUnit === 'Nos') {
      event.target.value = item.netAmount.toString();
      return;
    }
    let val = parseFloat(event.target.value) || 0;
    val = parseFloat(val.toFixed(2));
    if (val <= 0) {
      this.notificationService.showError(`Amount cannot be zero.`);
      const oldVal = item.netAmount;
      event.target.value = oldVal.toString();
      return;
    }
    event.target.value = val.toString();
    this.counterSaleService.updateAmount(index, val);
  }
  restrictDecimals(event: any) {
    let val = event.target.value;
    if (val && val.includes('.')) {
      const parts = val.split('.');
      if (parts[1] && parts[1].length > 2) {
        event.target.value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
  }

  removeItem(index: number) {
    const item = this.counterSaleService.cartItems()[index];
    const itemName = item?.details || 'Item';
    this.counterSaleService.removeItem(index);
    this.notificationService.showSuccess(`${itemName} removed from cart`);
  }

  clearCart() {
    this.counterSaleService.clearCart();
    this.notificationService.showSuccess('Cart cleared successfully');
  }
}
