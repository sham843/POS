import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, User, Loader, Receipt, Calendar, Search, RotateCcw, FileSpreadsheet, FileText } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/adapters/custom-date-adapter';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';

export interface UserSaleSummaryItem {
  userName: string;
  cashSale: number;
  onlineSale: number;
  couponSale: number;
  creditSale: number;
  totalBills: number;
  totalSale: number;
}

@Component({
  selector: 'app-user-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTableModule,
    EmptyState
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './user-report.html',
  styleUrl: './user-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly UserIcon = User;
  readonly LoaderIcon = Loader;
  readonly ReceiptIcon = Receipt;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;

  // Filter Date Objects (for mat-datepicker)
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // Formatted Filter Strings (for API payload)
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedUser = signal<string>('all');
  maxDate = new Date();

  // Report type state ('details' or 'summary')
  reportType = signal<'details' | 'summary'>('details');

  // Computed properties for column totals
  totalBillAmount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.totalAmount || item.TotalAmount) || 0), 0);
  });

  totalDiscount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.discount || item.Discount) || 0), 0);
  });

  totalTaxableAmount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.taxableAmount || item.TaxableAmount) || 0), 0);
  });

  totalCgst = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.cgst || item.Cgst || item.CGST) || 0), 0);
  });

  totalSgst = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.sgst || item.Sgst || item.SGST) || 0), 0);
  });

  totalIgst = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.igst || item.Igst || item.IGST) || 0), 0);
  });

  totalAfterTaxTotal = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.afterTaxTotal || item.AfterTaxTotal) || 0), 0);
  });

  totalChargeableAmount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.chargeableAmount || item.ChargeableAmount) || 0), 0);
  });

  totalRoundOff = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.roundOff || item.RoundOff) || 0), 0);
  });

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Dynamic user list for dropdown selector
  userList = signal<any[]>([]);

  // Report results from API
  reportData = signal<any[]>([]);

  normalizeSummaryData(item: any): UserSaleSummaryItem {
    return {
      userName: item.user_Name || item.userName || item.UserName || item.name || item.Name || '',
      cashSale: Number(item.total_Cash_Sale ?? item.cashSale ?? item.CashSale ?? item.cash_Sale ?? item.cashAmount ?? item.CashAmount ?? 0),
      onlineSale: Number(item.total_Online_Sale ?? item.onlineSale ?? item.OnlineSale ?? item.online_Sale ?? item.onlineAmount ?? item.OnlineAmount ?? 0),
      couponSale: Number(item.total_Coupon_Sale ?? item.couponSale ?? item.CouponSale ?? item.coupon_Sale ?? item.couponAmount ?? item.CouponAmount ?? 0),
      creditSale: Number(item.total_Credit_Sale ?? item.creditSale ?? item.CreditSale ?? item.credit_Sale ?? item.creditAmount ?? item.CreditAmount ?? 0),
      totalBills: Number(item.total_Bills ?? item.totalBills ?? item.TotalBills ?? item.billCount ?? item.BillCount ?? 0),
      totalSale: Number(item.totalSale ?? item.TotalSale ?? item.total_Sale ?? item.totalAmount ?? item.TotalAmount ?? 0)
    };
  }

  // Normalized summary data
  summaryData = computed<UserSaleSummaryItem[]>(() => {
    if (this.reportType() !== 'summary') return [];
    return this.reportData().map(item => this.normalizeSummaryData(item));
  });

  // Computed summary totals
  totalCashSale = computed(() => {
    return this.summaryData().reduce((sum, item) => sum + item.cashSale, 0);
  });

  totalOnlineSale = computed(() => {
    return this.summaryData().reduce((sum, item) => sum + item.onlineSale, 0);
  });

  totalCouponSale = computed(() => {
    return this.summaryData().reduce((sum, item) => sum + item.couponSale, 0);
  });

  totalCreditSale = computed(() => {
    return this.summaryData().reduce((sum, item) => sum + item.creditSale, 0);
  });

  totalBillsSummary = computed(() => {
    return this.summaryData().reduce((sum, item) => sum + item.totalBills, 0);
  });

  totalSaleSummary = computed(() => {
    return this.summaryData().reduce((sum, item) => sum + item.totalSale, 0);
  });

  // Dynamic active report length
  activeReportLength = computed(() => {
    return this.reportType() === 'summary' ? this.summaryData().length : this.reportData().length;
  });

  // Mat-table columns configuration
  displayedColumns = computed<string[]>(() => {
    if (this.reportType() === 'summary') {
      return [
        'user_Name',
        'cashSale',
        'onlineSale',
        'couponSale',
        'creditSale',
        'totalBills',
        'totalSale'
      ];
    }
    return [
      'user_Name',
      'billDetails',
      'customerName',
      'totalAmount',
      'discount',
      'taxableAmount',
      'cgst',
      'sgst',
      'igst',
      'afterTaxTotal',
      'roundOff',
      'chargeableAmount'
    ];
  });

  // Computed paginated view of active data
  paginatedData = computed(() => {
    const data = this.reportType() === 'summary' ? this.summaryData() : this.reportData();
    const size = this.pageSize();
    const pageIndex = this.currentPage();
    const start = pageIndex * size;
    const end = start + size;
    return data.slice(start, end);
  });

  // Toggle report type method
  setReportType(type: 'details' | 'summary') {
    this.reportType.set(type);
    this.currentPage.set(0);
    this.resetFiltersAndData();
  }

  resetFiltersAndData() {
    this.fromDateObj.set(null);
    this.toDateObj.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedUser.set('all');
    this.reportData.set([]);
  }

  ngOnInit() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatDate(firstDayOfMonth));
    this.toDate.set(this.formatDate(today));

    const userStr = localStorage.getItem('UserDetails');
    let orgId = 28; // Default orgId fallback
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);

        const currentUserId = user.id || user.UserId || 620;
        const currentUserName = user.name || 'Pravin Varpe';
        orgId = user.organizationId || user.organizationid || 28;

        this.userList.set([{ id: currentUserId, name: currentUserName }]);
      } catch (e) {
        console.error('Failed to parse user details:', e);
        this.userList.set([{ id: 620, name: 'Pravin Varpe' }]);
      }
    } else {
      this.userList.set([{ id: 620, name: 'Pravin Varpe' }]);
    }

    this.fetchUserList(orgId);
    
    // Automatically fetch reports on page load
    this.fetchReport();
  }

  fetchUserList(orgId: number) {
    this.apiService.get<any>(`api/v1/report/users?organizationId=${orgId}`).subscribe({
      next: (response) => {
        let usersData = [];
        if (response && response.data) {
          usersData = response.data;
        } else if (response && Array.isArray(response)) {
          usersData = response;
        }

        if (usersData && usersData.length > 0) {
          const mappedUsers = usersData.map((u: any) => ({
            id: u.id || u.Id || u.userId || u.UserId || 0,
            name: u.name || u.Name || u.userName || u.UserName || ''
          }));
          this.userList.set(mappedUsers);
        }
      },
      error: (err) => {
        console.error('Failed to fetch user list from API:', err);
      }
    });
  }

  fetchReport() {
    this.isLoading.set(true);
    const fromDate = this.fromDate();
    const toDate = this.toDate();
    const selected = this.selectedUser();

    let targetUserId = 0;
    if (selected !== 'all') {
      const found = this.userList().find(u => u.name === selected);
      targetUserId = found ? found.id : (this.currentUser()?.id || this.currentUser()?.UserId || 620);
    }

    const payload = {
      FromDate: fromDate,
      ToDate: toDate,
      UserId: targetUserId
    };

    const headers = new HttpHeaders({
      'X-Skip-Loader': 'true'
    });

    const endpoint = this.reportType() === 'details' ? 'api/v1/report/user-wise-sale' : 'api/v1/report/user-sale-summary';

    this.apiService.post<any>(endpoint, payload, headers).subscribe({
      next: (response) => {
        if (response && response.data) {
          console.log('API Response data sample:', response.data[0]);
          console.log('All Response data:', response.data);
          this.reportData.set(response.data);
        } else {
          this.reportData.set([]);
        }
        this.currentPage.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch user sale report:', err);
        this.reportData.set([]);
        this.currentPage.set(0);
        this.isLoading.set(false);
      }
    });
  }

  searchReport() {
    this.fetchReport();
  }

  clearFilters() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatDate(firstDayOfMonth));
    this.toDate.set(this.formatDate(today));
    this.selectedUser.set('all');
    this.fetchReport();
  }

  onFromDateChange(date: Date | null) {
    this.fromDateObj.set(date);
    if (date) {
      this.fromDate.set(this.formatDate(date));
      const currentTo = this.toDateObj();
      if (currentTo && date > currentTo) {
        this.toDateObj.set(date);
        this.toDate.set(this.formatDate(date));
      }
    } else {
      this.fromDate.set('');
    }
  }

  onToDateChange(date: Date | null) {
    this.toDateObj.set(date);
    if (date) {
      this.toDate.set(this.formatDate(date));
      const currentFrom = this.fromDateObj();
      if (currentFrom && date < currentFrom) {
        this.fromDateObj.set(date);
        this.fromDate.set(this.formatDate(date));
      }
    } else {
      this.toDate.set('');
    }
  }

  exportToExcel() {
    const isSummary = this.reportType() === 'summary';
    const data = isSummary ? this.summaryData() : this.reportData();
    if (!data || data.length === 0) {
      return;
    }

    let headers: string[];
    let rows: any[][];
    let footerRow: any[];

    if (isSummary) {
      headers = [
        'User Name',
        'Cash Sale (INR)',
        'Online Sale (INR)',
        'Coupon Sale (INR)',
        'Credit Sale (INR)',
        'Total Bills',
        'Total Sale (INR)'
      ];
      rows = (data as UserSaleSummaryItem[]).map(item => [
        item.userName,
        item.cashSale,
        item.onlineSale,
        item.couponSale,
        item.creditSale,
        item.totalBills,
        item.totalSale
      ]);
      footerRow = [
        'Total:',
        this.totalCashSale(),
        this.totalOnlineSale(),
        this.totalCouponSale(),
        this.totalCreditSale(),
        this.totalBillsSummary(),
        this.totalSaleSummary()
      ];
    } else {
      headers = [
        'User Name',
        'Bill No',
        'Bill Date',
        'Customer Name',
        'Payment Mode',
        'Total Amount (INR)',
        'Discount (INR)',
        'Taxable Amount (INR)',
        'CGST (INR)',
        'SGST (INR)',
        'IGST (INR)',
        'After Tax Total (INR)',
        'Chargeable Amount (INR)',
        'Round Off (INR)'
      ];

      rows = data.map(item => [
        item.user_Name || '',
        item.bill_Number || '',
        item.bill_Date || '',
        item.customer_Name || '',
        this.getPaymentMode(item) || '',
        item.totalAmount || item.TotalAmount || 0,
        item.discount || item.Discount || 0,
        item.taxableAmount || item.TaxableAmount || 0,
        item.cgst || item.Cgst || item.CGST || 0,
        item.sgst || item.Sgst || item.SGST || 0,
        item.igst || item.Igst || item.IGST || 0,
        item.afterTaxTotal || item.AfterTaxTotal || 0,
        item.chargeableAmount || item.ChargeableAmount || 0,
        item.roundOff || item.RoundOff || 0
      ]);

      footerRow = [
        'Total:',
        '',
        '',
        '',
        '',
        this.totalBillAmount(),
        this.totalDiscount(),
        this.totalTaxableAmount(),
        this.totalCgst(),
        this.totalSgst(),
        this.totalIgst(),
        this.totalAfterTaxTotal(),
        this.totalChargeableAmount(),
        this.totalRoundOff()
      ];
    }

    const selectedUserVal = this.selectedUser();
    let selectedUserName = 'All Users';
    if (selectedUserVal !== 'all') {
      const foundUser = this.userList().find(u => String(u.id) === String(selectedUserVal));
      if (foundUser) {
        selectedUserName = foundUser.name;
      } else {
        selectedUserName = selectedUserVal;
      }
    }
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    this.exportService.exportToExcel({
      title: isSummary ? 'User Sale Summary Report' : 'User Wise Sale Report',
      unitName,
      periodFrom: this.fromDate() || '-',
      periodTo: this.toDate() || '-',
      metaInfo: [
        { label: 'User Filter', value: selectedUserName }
      ],
      headers,
      rows,
      footerRow,
      fileName: isSummary 
        ? `User_Sale_Summary_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.xlsx`
        : `User_Wise_Sale_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const isSummary = this.reportType() === 'summary';
    const data = isSummary ? this.summaryData() : this.reportData();
    if (!data || data.length === 0) {
      return;
    }

    let headers: string[];
    let rows: any[][];
    let footerRow: any[];
    let columnAlignments: ('left' | 'center' | 'right')[];

    if (isSummary) {
      headers = [
        'Sr',
        'User Name',
        'Cash Sale',
        'Online Sale',
        'Coupon Sale',
        'Credit Sale',
        'Total Bills',
        'Total Sale'
      ];

      rows = (data as UserSaleSummaryItem[]).map((item, idx) => [
        idx + 1,
        item.userName,
        `Rs. ${item.cashSale.toFixed(2)}`,
        `Rs. ${item.onlineSale.toFixed(2)}`,
        `Rs. ${item.couponSale.toFixed(2)}`,
        `Rs. ${item.creditSale.toFixed(2)}`,
        item.totalBills.toString(),
        `Rs. ${item.totalSale.toFixed(2)}`
      ]);

      footerRow = [
        'Total:',
        '',
        `Rs. ${this.totalCashSale().toFixed(2)}`,
        `Rs. ${this.totalOnlineSale().toFixed(2)}`,
        `Rs. ${this.totalCouponSale().toFixed(2)}`,
        `Rs. ${this.totalCreditSale().toFixed(2)}`,
        this.totalBillsSummary().toString(),
        `Rs. ${this.totalSaleSummary().toFixed(2)}`
      ];

      columnAlignments = [
        'center', // Sr
        'left',   // User Name
        'right',  // Cash Sale
        'right',  // Online Sale
        'right',  // Coupon Sale
        'right',  // Credit Sale
        'center', // Total Bills
        'right'   // Total Sale
      ];
    } else {
      headers = [
        'Sr',
        'User Name',
        'Bill No / Date',
        'Customer Name',
        'Payment Mode',
        'Total Amt',
        'Disc',
        'Taxable Amt',
        'CGST',
        'SGST',
        'IGST',
        'After Tax',
        'Chargeable',
        'Round Off'
      ];

      rows = data.map((item, idx) => [
        idx + 1,
        item.user_Name || '',
        `${item.bill_Number || '-'}<br/><small>${item.bill_Date || ''}</small>`,
        item.customer_Name || '-',
        this.getPaymentMode(item) || '-',
        `Rs. ${(Number(item.totalAmount || item.TotalAmount) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.discount || item.Discount) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.taxableAmount || item.TaxableAmount) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.cgst || item.Cgst || item.CGST) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.sgst || item.Sgst || item.SGST) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.igst || item.Igst || item.IGST) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.afterTaxTotal || item.AfterTaxTotal) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.chargeableAmount || item.ChargeableAmount) || 0).toFixed(2)}`,
        `Rs. ${(Number(item.roundOff || item.RoundOff) || 0).toFixed(2)}`
      ]);

      footerRow = [
        'Total:',
        '',
        '',
        '',
        '',
        `Rs. ${this.totalBillAmount().toFixed(2)}`,
        `Rs. ${this.totalDiscount().toFixed(2)}`,
        `Rs. ${this.totalTaxableAmount().toFixed(2)}`,
        `Rs. ${this.totalCgst().toFixed(2)}`,
        `Rs. ${this.totalSgst().toFixed(2)}`,
        `Rs. ${this.totalIgst().toFixed(2)}`,
        `Rs. ${this.totalAfterTaxTotal().toFixed(2)}`,
        `Rs. ${this.totalChargeableAmount().toFixed(2)}`,
        `Rs. ${this.totalRoundOff().toFixed(2)}`
      ];

      columnAlignments = [
        'center', // Sr
        'left',   // User Name
        'left',   // Bill No / Date
        'left',   // Customer Name
        'center', // Payment Mode
        'right',  // Total Amt
        'right',  // Disc
        'right',  // Taxable Amt
        'right',  // CGST
        'right',  // SGST
        'right',  // IGST
        'right',  // After Tax
        'right',  // Chargeable
        'right'   // Round Off
      ];
    }

    const selectedUserVal = this.selectedUser();
    let selectedUserName = 'All Users';
    if (selectedUserVal !== 'all') {
      const foundUser = this.userList().find(u => String(u.id) === String(selectedUserVal));
      if (foundUser) {
        selectedUserName = foundUser.name;
      } else {
        selectedUserName = selectedUserVal;
      }
    }
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    this.exportService.exportToPdf({
      title: isSummary ? 'User Sale Summary Report' : 'User Wise Sale Report',
      unitName,
      periodFrom: this.fromDate() || '-',
      periodTo: this.toDate() || '-',
      metaInfo: [
        { label: 'User Filter', value: selectedUserName }
      ],
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: isSummary
        ? `User_Sale_Summary_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.pdf`
        : `User_Wise_Sale_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.pdf`
    });
  }

  formatDate(date: Date): string {
    const month = '' + (date.getMonth() + 1);
    const day = '' + date.getDate();
    const year = date.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }

  getPaymentMode(item: any): string {
    const mode = item.modeofPayment || item.modeOfPayment || item.mode_of_Payment || item.paymentMode || item.PaymentMode || item.billType || item.BillType || item.method || item.Method;
    if (!mode) return '';
    const m = mode.toString().toLowerCase();
    if (m.includes('credit')) return 'Credit';
    if (m.includes('cash')) return 'Cash';
    if (m.includes('coupon')) return 'Coupon';
    if (m.includes('online') || m.includes('upi')) return 'Online';
    return mode.toString();
  }
}
