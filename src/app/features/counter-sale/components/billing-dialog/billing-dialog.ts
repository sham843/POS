import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule, Banknote, Globe, CreditCard, X, CheckCircle } from 'lucide-angular';
import { CartItem } from '../../../../core/services/counter-sale.service';

export interface BillingDialogData {
  paymentMode: 'cash' | 'online' | 'card';
  customerName?: string;
  cartItems: CartItem[];
  subTotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalGst: number;
  billAmount: number;
  roundOff: number;
  totalPayable: number;
}

@Component({
  selector: 'app-billing-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatDividerModule,
    MatCheckboxModule,
    LucideAngularModule,
  ],
  templateUrl: './billing-dialog.html',
  styleUrl: './billing-dialog.scss',
})
export class BillingDialog {
  readonly Banknote = Banknote;
  readonly Globe = Globe;
  readonly CreditCard = CreditCard;
  readonly X = X;
  readonly CheckCircle = CheckCircle;

  displayedColumns = ['item', 'rate', 'qty', 'discount', 'sgst', 'cgst', 'amount', 'total'];
  printAutomatically = false;

  // Split GST equally as SGST/CGST (intra-state), or full IGST (inter-state)
  // Defaulting to intra-state split
  get sgst(): number { return this.data.totalGst / 2; }
  get cgst(): number { return this.data.totalGst / 2; }
  get igst(): number { return 0; }

  get paymentLabel(): string {
    if (this.data.paymentMode === 'cash') return 'Cash';
    if (this.data.paymentMode === 'online') return 'Online / UPI';
    return 'Credit / Coupon';
  }

  constructor(
    public dialogRef: MatDialogRef<BillingDialog>,
    @Inject(MAT_DIALOG_DATA) public data: BillingDialogData
  ) { }

  confirm() {
    this.dialogRef.close({
      confirmed: true,
      paymentMode: this.data.paymentMode,
      printAutomatically: this.printAutomatically
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
