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

  // Initial empty data to prevent ExpressionChangedAfterItHasBeenCheckedError
  saleOverview: any = {
    creditSale: 0, couponSale: 0, onlineSale: 0, cashSale: 0,
    totalSale: 0, totalBills: 0, onlineSaleDetail: 0, customerDepositOnline: 0
  };

  cashOverview: any = {
    cashSale: 0, openingBalance: 0, couponAdvReceived: 0, otherCash: 0,
    expense: 0, nextShiftBalance: 0, actualCashReceived: 0
  };

  denominations: any[] = [];

  totalCollection = 0;
  remark = '';
  isLoading = true;

  private apiService = inject(ApiService);

  constructor(
    public dialogRef: MatDialogRef<CashReportViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {

  }

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

    if (this.data.reportType !== 'summary' && this.data.sessionId) {
      const url = `api/v1/report/GetCashierReport?SessionId=${this.data.sessionId}`;
      this.apiService.get<any>(url).subscribe({
        next: (response) => {
          const resData = response.data ? response.data : response;
          if (resData && (resData.id || resData.totalSale !== undefined || resData.cashDemo)) {
            this.bindData(resData);
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Error fetching session details', err);
          this.isLoading = false;
        }
      });
    } else if (this.data.reportType === 'summary' && this.data.rawDate && this.data.userId !== undefined) {
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
          if (resData && (resData.id || resData.totalSale !== undefined || resData.cashDemo)) {
            this.bindData(resData);
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Error fetching summary details', err);
          this.isLoading = false;
        }
      });
    } else {
      console.warn('Missing required data for API call', this.data);
      this.isLoading = false;
    }
  }

  private bindData(resData: any) {
    this.saleOverview = {
      creditSale: resData.creditSale || 0,
      couponSale: resData.couponSale || 0,
      onlineSale: resData.onlineSale || 0,
      cashSale: resData.cashSale || 0,
      totalSale: resData.totalSale || 0,
      totalBills: resData.totalBill || resData.totalBills || 0,
      onlineSaleDetail: resData.onlineSale || 0,
      customerDepositOnline: resData.custDepositOnline || resData.customerDepositOnline || 0
    };

    this.cashOverview = {
      cashSale: resData.cashSale || 0,
      openingBalance: resData.openingBalanceOfCurrentShift || resData.openingBalance || 0,
      couponAdvReceived: resData.couponCustAdvReceived || resData.couponAdvReceived || 0,
      otherCash: resData.otherCash || 0,
      expense: resData.expense || 0,
      nextShiftBalance: resData.openingBalanceForNextShift || resData.openingBalanceNextShift || 0,
      actualCashReceived: resData.actualCashReceived || 0
    };

    this.remark = resData.remark || '';
    let calculatedTotal = 0;

    // Parse denominations if available
    const denoms = resData.cashDemo || resData.denominations || [];
    if (denoms && Array.isArray(denoms) && denoms.length > 0) {
      // Update counts based on response
      this.denominations.forEach(den => {
        const matched = denoms.find((d: any) => d.denomination === den.value || d.value === den.value);
        if (matched) {
          den.count = matched.quantity || matched.count || 0;
          den.total = matched.amount || matched.total || (den.value * den.count);
          calculatedTotal += den.total;
        } else {
          den.count = 0;
          den.total = 0;
        }
      });
    } else {
      // Reset to 0 if not provided
      this.denominations.forEach(d => { d.count = 0; d.total = 0; });
    }
    
    this.totalCollection = resData.totalCollection || calculatedTotal || 0;
    
    // If actualCashReceived is missing from API, fallback to totalCollection (which matches the cash counted)
    if (!this.cashOverview.actualCashReceived) {
      this.cashOverview.actualCashReceived = this.totalCollection;
    }

    this.isLoading = false;
  }

  close(): void {
    this.dialogRef.close();
  }

  printReport(): void {
    window.print();
  }
}
