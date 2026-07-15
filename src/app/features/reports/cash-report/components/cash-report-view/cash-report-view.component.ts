import { Component, Inject, OnInit, inject, ChangeDetectorRef } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import {
  LucideAngularModule,
  Receipt,
  User,
  Calendar,
  Clock,
  CreditCard,
  Banknote,
  Printer,
  X,
  Wallet,
  ChevronRight,
} from 'lucide-angular';
import { ApiService } from '../../../../../core/services/api.service';

@Component({
  selector: 'app-cash-report-view',
  standalone: true,
  imports: [MatDialogModule, LucideAngularModule],
  templateUrl: './cash-report-view.component.html',
  styleUrl: './cash-report-view.component.scss',
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

  // Initial empty data to prevent ExpressionChangedAfterItHasBeenCheckedError
  saleOverview: any = {
    creditSale: 0,
    couponSale: 0,
    onlineSale: 0,
    cashSale: 0,
    totalSale: 0,
    totalBills: 0,
    onlineSaleDetail: 0,
    customerDepositOnline: 0,
  };

  cashOverview: any = {
    cashSale: 0,
    openingBalance: 0,
    couponAdvReceived: 0,
    otherCash: 0,
    expense: 0,
    nextShiftBalance: 0,
    actualCashReceived: 0,
  };

  denominations: any[] = [];

  totalCollection = 0;
  remark = '';
  isLoading = true;

  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    public dialogRef: MatDialogRef<CashReportViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
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

    if (this.data) {
      this.fetchReportDetails();
    } else {
      this.isLoading = false;
    }
  }

  fetchReportDetails() {
    this.isLoading = true;
    if (this.data.reportType !== 'summary' && this.data.sessionIds) {
      const url = `api/v1/report/GetCashierReport?SessionId=${this.data.sessionIds}`;
      this.apiService.get<any>(url).subscribe({
        next: (response) => {
          const resData = response.data ? response.data : response;
          const finalData = Array.isArray(resData) ? resData[0] : resData;
          if (finalData) {
            this.bindData(finalData);
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Error fetching session details', err);
          this.isLoading = false;
        },
      });
    } else if (
      this.data.reportType === 'summary' &&
      this.data.rawDate &&
      this.data.userId !== undefined
    ) {
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
          const resData = response.data ? response.data : response;
          const finalData = Array.isArray(resData) ? resData[0] : resData;
          if (finalData) {
            this.bindData(finalData);
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Error fetching summary details', err);
          this.isLoading = false;
        },
      });
    } else {
      console.warn('Missing required data for API call', this.data);
      this.isLoading = false;
    }
  }

  private bindData(resData: any) {
    debugger;
    if (!resData) return;

    this.saleOverview = {
      creditSale: resData.creditSale || 0,
      couponSale: resData.couponSale || 0,
      onlineSale: resData.onlineSale || 0,
      cashSale: resData.cashSale || 0,
      totalSale: resData.totalSale || 0,
      totalBills: resData.totalBill || 0,
      onlineSaleDetail: resData.onlineSale || 0,
      customerDepositOnline: resData.custDepositOnline || 0,
    };

    this.cashOverview = {
      cashSale: resData.cashSale || 0,
      openingBalance: resData.openingBalanceOfCurrentShift || 0,
      couponAdvReceived: resData.couponCustAdvReceived || 0,
      otherCash: resData.otherCash || 0,
      expense: resData.expense || 0,
      nextShiftBalance: resData.openingBalanceForNextShift || 0,
      actualCashReceived: 0, // Will be calculated from denominations
    };

    if (resData.createdDate) {
      this.data.depositDate = resData.createdDate;
    } else if (this.data.depositDate && this.data.depositDate.length === 8) {
      // Convert DD-MM-YY to DD-MM-YYYY
      const parts = this.data.depositDate.split('-');
      if (parts.length === 3 && parts[2].length === 2) {
        this.data.depositDate = `${parts[0]}-${parts[1]}-20${parts[2]}`;
      }
    }

    this.remark = resData.remark || '';
    let calculatedTotal = 0;

    // Parse denominations if available
    const denoms = resData.cashDemo || [];
    this.denominations = [];
    if (denoms && Array.isArray(denoms) && denoms.length > 0) {
      denoms.forEach((d: any) => {
        const count = d.quantity || 0;
        const total = d.amount || d.denomination * count;
        this.denominations.push({
          value: d.denomination,
          count: count,
          total: total,
        });
        calculatedTotal += total;
      });
    }

    this.totalCollection = calculatedTotal;

    // Actual cash received is exactly the total collection in the drawer
    this.cashOverview.actualCashReceived = this.totalCollection;

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  close(): void {
    this.dialogRef.close();
  }

  printReport(): void {
    window.print();
  }
}
