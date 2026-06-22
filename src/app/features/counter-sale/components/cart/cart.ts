import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
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

  displayedColumns: string[] = ['details', 'quantity', 'rate', 'discount', 'amount', 'gst', 'total'];

  // Data source for the table uses the shared cart state
  dataSource = this.counterSaleService.cartItems;
  loadedInvoiceDate = this.counterSaleService.invoiceHeader.loadedInvoiceDate;
  invoiceNo = this.counterSaleService.invoiceHeader.invoiceNo;
  invoiceId = this.counterSaleService.invoiceHeader.invoiceId;

  // Combines id + invoiceNo + formatted date into one display string
  invoiceSummary = computed(() => {
    const raw = this.loadedInvoiceDate();
    const no = this.invoiceNo();
    const id = this.invoiceId();
    if (!raw && !no && !id) return null;
    let datePart = '';
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(d.getDate()).padStart(2, '0');
        const mon = months[d.getMonth()];
        const yr = d.getFullYear();
        datePart = `${day} ${mon} ${yr}`;
      } else {
        datePart = raw;
      }
    }
    const parts: string[] = [];
    if (id) parts.push(`${id}`);
    if (no) parts.push(no);
    if (datePart) parts.push(datePart);
    return parts.join('/');
  });

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
