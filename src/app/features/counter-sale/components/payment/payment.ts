import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule, Delete, Banknote, Globe, CreditCard, Eraser } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { BillingDialog } from '../billing-dialog/billing-dialog';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatButtonModule
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment {
  counterSaleService = inject(CounterSaleService);
  notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);

  // Expose icons to template
  readonly Delete = Delete;
  readonly Banknote = Banknote;
  readonly Globe = Globe;
  readonly CreditCard = CreditCard;
  readonly Eraser = Eraser;

  get mode() {
    return this.counterSaleService.numpadMode;
  }

  get numpadValue() {
    return this.counterSaleService.numpadValue;
  }

  setMode(mode: 'quantity' | 'amount' | 'discount') {
    this.counterSaleService.setNumpadMode(mode);
  }

  handleInput(val: string) {
    this.counterSaleService.handleNumpadInput(val);
  }

  setQuickWeight(val: string) {
    this.counterSaleService.setNumpadValueExplicit(val);
  }

  openBillingDialog(paymentMode: 'cash' | 'online' | 'card') {
    if (this.counterSaleService.cartItems().length === 0) {
      this.notificationService.showError('Please add items to the cart first.');
      return;
    }

    const ref = this.dialog.open(BillingDialog, {
      data: {
        paymentMode,
        cartItems: this.counterSaleService.cartItems(),
        subTotal: this.counterSaleService.subTotal(),
        totalDiscount: this.counterSaleService.totalDiscount(),
        taxableAmount: this.counterSaleService.taxableAmount(),
        totalGst: this.counterSaleService.totalGst(),
        billAmount: this.counterSaleService.billAmount(),
        roundOff: this.counterSaleService.roundOff(),
        totalPayable: this.counterSaleService.totalPayable(),
      },
      panelClass: 'billing-dialog-panel',
      maxWidth: '95vw',
      autoFocus: false,
    });

    ref.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        const mode = result.paymentMode === 'cash' ? 'Cash' :
                     result.paymentMode === 'online' ? 'Online' : 'Card';
        this.notificationService.showSuccess(`Payment of ₹${this.counterSaleService.totalPayable()} received via ${mode}`);
        this.counterSaleService.clearCart();
      }
    });
  }
}
