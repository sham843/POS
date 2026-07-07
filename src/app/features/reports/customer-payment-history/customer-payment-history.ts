import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule, Loader, Calendar, Search, RotateCcw, FileSpreadsheet, FileText, History, Receipt, Banknote, CreditCard, Users, Hash } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/adapters/custom-date-adapter';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';

export interface PaymentHistoryItem {
  customerNo: string | number;
  customerName: string;
  bankLeger: string;
  paymentDate: string;
  totalCredit: number;
  paymentNote: string;
  userName: string;
  modeOfPayment?: string;
}

@Component({
  selector: 'app-customer-payment-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTableModule,
    EmptyState
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './customer-payment-history.html',
  styleUrl: './customer-payment-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerPaymentHistory implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly LoaderIcon = Loader;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly HistoryIcon = History;
  readonly ReceiptIcon = Receipt;
  readonly BankIcon = Banknote;
  readonly CardIcon = CreditCard;
  readonly UsersIcon = Users;
  readonly HashIcon = Hash;

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  customerId = signal<number>(0);
  modeOfPaymentId = signal<number>(0);

  maxDate = new Date();

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  customersList = signal<any[]>([]);
  paymentModes = signal<any[]>([
    { id: 0, name: 'All Payment Modes' },
    { id: 1, name: 'Cash' },
    { id: 2, name: 'Cheque' },
    { id: 3, name: 'NEFT/RTGS' },
    { id: 4, name: 'UPI' }
  ]);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Report results from API
  reportData = signal<PaymentHistoryItem[]>([]);

  normalizeItem(item: any): PaymentHistoryItem {
    return {
      customerNo: item.customerNo || item.customer_No || 0,
      customerName: item.customerName || item.customer_Name || '-',
      bankLeger: item.bankLeger || item.bank_Leger || item.bankLedger || '-',
      paymentDate: item.paymentDate || item.payment_Date || '',
      totalCredit: Number(item.totalCredit || item.total_Credit || 0),
      paymentNote: item.paymentNote || item.payment_Note || '',
      userName: item.userName || item.user_Name || '-',
      modeOfPayment: item.modeofPayment || item.modeOfPayment || item.mode_of_Payment || item.paymentMode || ''
    };
  }

  getPaymentModeBadgeClass(mode: string | undefined): string {
    if (!mode) return 'badge-credit';
    const lowerMode = mode.toLowerCase();
    if (lowerMode.includes('cash')) {
      return 'badge-cash';
    } else if (lowerMode.includes('neft') || lowerMode.includes('rtgs') || lowerMode.includes('upi') || lowerMode.includes('online')) {
      return 'badge-online';
    } else {
      return 'badge-credit';
    }
  }

  normalizedData = computed<PaymentHistoryItem[]>(() => {
    return this.reportData().map(item => this.normalizeItem(item));
  });

  // Computed totals for table footer
  totals = computed(() => {
    return this.normalizedData().reduce((acc, item) => {
      acc.totalCredit += Number(item.totalCredit) || 0;
      return acc;
    }, { totalCredit: 0 });
  });

  // Computed paginated view of active data
  paginatedData = computed(() => {
    const data = this.normalizedData();
    const size = this.pageSize();
    const pageIndex = this.currentPage();
    const start = pageIndex * size;
    const end = start + size;
    return data.slice(start, end);
  });

  displayedColumns = [
    'srNo',
    'customerDetails',
    'bankLeger',
    'paymentDate',
    'totalCredit',
    'paymentNote',
    'userName'
  ];

  ngOnInit() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatToIsoString(firstDayOfMonth, false));
    this.toDate.set(this.formatToIsoString(today, true));

    const userStr = localStorage.getItem('UserDetails');
    let orgId = 0;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
        orgId = user.organizationId || 0;
      } catch (e) {
        console.error('Failed to parse user from local storage');
      }
    }

    this.fetchCustomers(orgId);
    this.fetchReport();
  }

  fetchCustomers(orgId: number) {
    this.apiService.get<any>(`api/v1/report/customers?organizationId=${orgId}`).subscribe({
      next: (res) => {
        let customers = [];
        if (res && res.data) {
          customers = res.data;
        } else if (Array.isArray(res)) {
          customers = res;
        }

        let finalCustomers = [...customers];
        const allIndex = finalCustomers.findIndex((c: any) => c.id === 0 || (c.name && c.name.toLowerCase() === 'all') || (c.customerName && c.customerName.toLowerCase() === 'all'));

        if (allIndex !== -1) {
          // Update the existing 'All' option from API
          finalCustomers[allIndex] = { ...finalCustomers[allIndex], name: 'All Customers', customerName: 'All Customers' };
        } else {
          // Prepend if not found
          finalCustomers = [{ id: 0, name: 'All Customers', customerName: 'All Customers' }, ...finalCustomers];
        }

        this.customersList.set(finalCustomers);
      },
      error: (err) => console.error('Error fetching customers', err)
    });
  }

  fetchReport() {
    const fromDate = this.fromDate();
    const toDate = this.toDate();

    if (!fromDate || !toDate) {
      return;
    }

    const cleanFromDate = fromDate.split('T')[0];
    const cleanToDate = toDate.split('T')[0];
    const custId = this.customerId();
    const modeId = this.modeOfPaymentId();

    this.isLoading.set(true);

    this.apiService.get<any>(`api/v1/report/GetCustomerDepositHistory?customerId=${custId}&fromDate=${cleanFromDate}&toDate=${cleanToDate}&modeOfPaymentId=${modeId}`).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.reportData.set(response.data);
        } else if (Array.isArray(response)) {
          this.reportData.set(response);
        } else {
          this.reportData.set([]);
        }
        this.currentPage.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch deposit history:', err);
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
    this.fromDate.set(this.formatToIsoString(firstDayOfMonth, false));
    this.toDate.set(this.formatToIsoString(today, true));
    this.customerId.set(0);
    this.modeOfPaymentId.set(0);
    this.fetchReport();
  }

  formatToIsoString(date: Date, isEndDate: boolean): string {
    const d = new Date(date);
    if (isEndDate) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, -1);
  }

  onFromDateChange(date: Date | null) {
    this.fromDateObj.set(date);
    if (date) {
      this.fromDate.set(this.formatToIsoString(date, false));
      const currentTo = this.toDateObj();
      if (currentTo && date > currentTo) {
        this.toDateObj.set(date);
        this.toDate.set(this.formatToIsoString(date, true));
      }
    } else {
      this.fromDate.set('');
    }
  }

  onToDateChange(date: Date | null) {
    this.toDateObj.set(date);
    if (date) {
      this.toDate.set(this.formatToIsoString(date, true));
    } else {
      this.toDate.set('');
    }
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }

  exportToExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr. No.', 'Customer No.', 'Customer Name', 'Bank/Cash Leger',
      'Payment Date', 'Total Credit', 'Payment Note', 'User Name'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.customerNo,
      item.customerName,
      item.bankLeger,
      item.paymentDate ? new Date(item.paymentDate).toLocaleString('en-GB') : '-',
      item.totalCredit,
      item.paymentNote || '-',
      item.userName || '-'
    ]);

    const footerRow = [
      'Total:', '', '', '', '',
      this.totals().totalCredit,
      '', ''
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];

    const metaInfo: any[] = [
      { label: 'Total Records', value: String(data.length) }
    ];

    const modeObj = this.paymentModes().find(m => m.id === this.modeOfPaymentId());
    if (modeObj && modeObj.id !== 0) {
      metaInfo.unshift({ label: 'Payment Mode', value: modeObj.name });
    }

    const custObj = this.customersList().find(c => c.id === this.customerId());
    if (custObj && custObj.id !== 0) {
      metaInfo.unshift({ label: 'Customer', value: custObj.name || custObj.customerName });
    }

    this.exportService.exportToExcel({
      title: 'Customer Payment History',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Customer_Payment_History_${cleanFromDate}_to_${cleanToDate}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr.', 'Cust No', 'Customer Name', 'Bank/Cash Ledger',
      'Payment Date', 'Total Credit', 'Payment Note', 'User Name'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.customerNo,
      item.customerName,
      item.bankLeger,
      item.paymentDate ? new Date(item.paymentDate).toLocaleString('en-GB') : '-',
      Number(item.totalCredit).toFixed(2),
      item.paymentNote || '-',
      item.userName || '-'
    ]);

    const footerRow = [
      'Total:', '', '', '', '',
      this.totals().totalCredit.toFixed(2),
      '', ''
    ];

    const columnAlignments: ('center' | 'left' | 'right')[] = [
      'center', 'center', 'left', 'left', 'center', 'right', 'left', 'left'
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    const metaInfo: any[] = [
      { label: 'Total Records', value: String(data.length) }
    ];

    const modeObj = this.paymentModes().find(m => m.id === this.modeOfPaymentId());
    if (modeObj && modeObj.id !== 0) {
      metaInfo.unshift({ label: 'Payment Mode', value: modeObj.name });
    }

    const custObj = this.customersList().find(c => c.id === this.customerId());
    if (custObj && custObj.id !== 0) {
      metaInfo.unshift({ label: 'Customer', value: custObj.name || custObj.customerName });
    }

    this.exportService.exportToPdf({
      title: 'Customer Payment History',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Customer_Payment_History_${cleanFromDate}_to_${cleanToDate}.pdf`
    });
  }
}
