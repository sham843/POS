import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, Delete, Banknote, Globe, CreditCard, Eraser } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { BillingDialog } from '../billing-dialog/billing-dialog';
import { NotificationService } from '../../../../core/services/notification.service';
import { DialogService } from '../../../../core/services/dialog.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Payment {
  counterSaleService = inject(CounterSaleService);
  notificationService = inject(NotificationService);
  dialogService = inject(DialogService);
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

  get isDecimalAllowed() {
    const idx = this.counterSaleService.selectedItemIndex();
    if (idx === null || idx < 0) return true;
    const item = this.counterSaleService.cartItems()[idx];
    if (!item) return true;
    
    const mensurationType = item.product?.['mensurationType'];
    const mensurationUnit = item.product?.['mensurationUnit'];
    if ((mensurationType && String(mensurationType).toLowerCase() === 'count') || 
        (mensurationUnit && String(mensurationUnit) === 'Nos')) {
      return false;
    }
    return true;
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

    const invalidItems = this.counterSaleService.cartItems().filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      this.notificationService.showError("One or more items have quantity 0. Please update the quantity or remove them before payment.");
      return;
    }

    if (paymentMode === 'card') {
      const customer = this.counterSaleService.selectedCustomer();
      if (customer?.billingType?.toLowerCase() === 'prepaid') {
        const balance = customer.balanceAtDairy || customer.balance || 0;
        if (balance < 0) {
          this.notificationService.showError('Prepaid customer balance is less than 0. Payment cannot be processed.');
          return;
        }
      }
    }

    const ref = this.dialog.open(BillingDialog, {
      data: {
        paymentMode,
        customerName: this.counterSaleService.selectedCustomer()?.customerName || this.counterSaleService.selectedCustomer()?.name || 'Daily Cash Counter Party',
        billingType: this.counterSaleService.selectedCustomer()?.billingType,
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
        this.counterSaleService.saveInvoice(result.paymentMode, result.printAutomatically);
      }
    });
  }

  clearAll() {
    this.counterSaleService.clearCart();
    this.counterSaleService.updateSearchQuery('');
    this.notificationService.showSuccess('All fields and cart cleared');
  }

  isCreditInsufficient(): boolean {
    const customer = this.counterSaleService.selectedCustomer();
    if (!customer) return false;

    const billingType = (customer.billingType || '').toLowerCase();
    const totalPayable = this.counterSaleService.totalPayable();

    if (billingType === 'prepaid') {
      const balance = customer.balanceAtDairy || customer.balance || 0;
      return balance <= 0 || balance < totalPayable;
    } else {
      const creditLimit = customer.creditLimit || 0;
      return creditLimit <= 0 || creditLimit < totalPayable;
    }
  }
}
