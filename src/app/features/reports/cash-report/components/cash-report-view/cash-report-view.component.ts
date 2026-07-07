import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { LucideAngularModule, Receipt, User, Calendar, Clock, CreditCard, Banknote, Printer, X, Wallet, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-cash-report-view',
  standalone: true,
  imports: [CommonModule, MatDialogModule, LucideAngularModule],
  templateUrl: './cash-report-view.component.html',
  styleUrl: './cash-report-view.component.scss'
})
export class CashReportViewComponent implements OnInit {
  readonly ReceiptIcon = Receipt;
  readonly UserIcon = User;
  readonly CalendarIcon = Calendar;
  readonly ClockIcon = Clock;
  readonly CreditCardIcon = CreditCard;
  readonly BanknoteIcon = Banknote;
  readonly PrinterIcon = Printer;
  readonly XIcon = X;
  readonly WalletIcon = Wallet;
  readonly ChevronRightIcon = ChevronRight;

  // Mock data for UI design preview until API is integrated
  saleOverview = {
    creditSale: 54280,
    couponSale: 8422,
    onlineSale: 100,
    cashSale: 0,
    totalSale: 62802,
    totalBills: 47,
    onlineSaleDetail: 100,
    customerDepositOnline: 171
  };

  cashOverview = {
    cashSale: 0,
    openingBalance: 0,
    couponAdvReceived: 21596,
    otherCash: 220,
    expense: 100,
    nextShiftBalance: 1000,
    actualCashReceived: 9418
  };

  denominations = [
    { value: 500, count: 13, total: 6500 },
    { value: 200, count: 7, total: 1400 },
    { value: 100, count: 10, total: 1000 },
    { value: 50, count: 5, total: 250 },
    { value: 20, count: 10, total: 200 },
    { value: 10, count: 5, total: 50 },
    { value: 5, count: 2, total: 10 },
    { value: 2, count: 4, total: 8 }
  ];

  totalCollection = 9418;
  remark = 'submited';

  constructor(
    public dialogRef: MatDialogRef<CashReportViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    // We will bind API data to these properties later
  }

  close(): void {
    this.dialogRef.close();
  }

  printReport(): void {
    window.print();
  }
}
