import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { LucideAngularModule, Receipt, User, Calendar, Clock, CreditCard, Banknote, Printer, X, Wallet, ChevronRight } from 'lucide-angular';
import { ApiService } from '../../../../../core/services/api.service';

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

  unitName: string = '';

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

  totalCollection = 0;
  remark = '';
  isLoading = true;

  private apiService = inject(ApiService);

  constructor(
    public dialogRef: MatDialogRef<CashReportViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        const userDetails = JSON.parse(userStr);
        this.unitName = userDetails.unitName || userDetails.UnitName || '';
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }

    if (this.data && this.data.userId && this.data.rawDate) {
      this.fetchReportDetails();
    } else {
      this.isLoading = false;
    }
  }

  fetchReportDetails() {
    this.isLoading = true;
    
    // Format date from DD-MM-YYYY to YYYY-MM-DD if needed
    let apiDate = this.data.rawDate;
    if (apiDate && apiDate.includes('-')) {
      const parts = apiDate.split('-');
      if (parts[0].length === 2) {
        apiDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD-MM-YYYY to YYYY-MM-DD
      }
    } else if (apiDate && apiDate.includes('T')) {
      apiDate = apiDate.split('T')[0];
    }

    const url = `api/v1/report/GetDailyCashierSummary?date=${apiDate}&userId=${this.data.userId}`;

    this.apiService.get<any>(url).subscribe({
      next: (response) => {
        if (response && response.data) {
          const resData = response.data;
          
          this.saleOverview = {
            creditSale: resData.creditSale || 0,
            couponSale: resData.couponSale || 0,
            onlineSale: resData.onlineSale || 0,
            cashSale: resData.cashSale || 0,
            totalSale: resData.totalSale || 0,
            totalBills: resData.totalBills || 0,
            onlineSaleDetail: resData.onlineSale || 0,
            customerDepositOnline: resData.customerDepositOnline || 0
          };

          this.cashOverview = {
            cashSale: resData.cashSale || 0,
            openingBalance: resData.openingBalance || 0,
            couponAdvReceived: resData.couponCustAdvReceived || resData.couponAdvReceived || 0,
            otherCash: resData.otherCash || 0,
            expense: resData.expense || 0,
            nextShiftBalance: resData.openingBalanceNextShift || 0,
            actualCashReceived: resData.actualCashReceived || 0
          };
          
          this.totalCollection = resData.totalCollection || resData.actualCashReceived || 0;
          this.remark = resData.remark || '';
          
          // Parse denominations if available
          if (resData.denominations && Array.isArray(resData.denominations)) {
            // Update counts based on response
            this.denominations.forEach(den => {
              const matched = resData.denominations.find((d: any) => d.value === den.value);
              if (matched) {
                den.count = matched.count || 0;
                den.total = den.value * den.count;
              } else {
                den.count = 0;
                den.total = 0;
              }
            });
          } else {
             // Reset to 0 if not provided
             this.denominations.forEach(d => { d.count = 0; d.total = 0; });
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching details', err);
        this.isLoading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  printReport(): void {
    window.print();
  }
}
