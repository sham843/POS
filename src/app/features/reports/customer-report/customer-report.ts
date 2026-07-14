import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';

import { LucideAngularModule, Loader, Receipt, Calendar, Search, RotateCcw, FileSpreadsheet, FileText, User } from 'lucide-angular';
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

export interface CustomerSaleItem {
  customerId: number;
  customerName: string;
  billNumber: number;
  billDate: string;
  totalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  afterTaxTotal: number;
  chargeableAmount: number;
  roundOff: number;
}

@Component({
  selector: 'app-customer-report',
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
  templateUrl: './customer-report.html',
  styleUrl: './customer-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly LoaderIcon = Loader;
  readonly ReceiptIcon = Receipt;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly UserIcon = User;

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  customerId = signal<number>(0); // 0 means all customers
  maxDate = new Date();

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);
  customersList = signal<any[]>([]);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Report results from API
  reportData = signal<any[]>([]);

  normalizeItem(item: any): CustomerSaleItem {
    return {
      customerId: Number(item.customer_Id ?? item.customerId ?? 0),
      customerName: item.customer_Name ?? item.customerName ?? '',
      billNumber: Number(item.bill_Number ?? item.billNumber ?? 0),
      billDate: item.bill_Date ?? item.billDate ?? '',
      totalAmount: Number(item.total_Amount ?? item.totalAmount ?? 0),
      discountAmount: Number(item.discount_Amount ?? item.discountAmount ?? item.discount ?? 0),
      taxableAmount: Number(item.taxable_Amount ?? item.taxableAmount ?? 0),
      cgst: Number(item.cgst ?? item.Cgst ?? item.CGST ?? 0),
      sgst: Number(item.sgst ?? item.Sgst ?? item.SGST ?? 0),
      igst: Number(item.igst ?? item.Igst ?? item.IGST ?? 0),
      afterTaxTotal: Number(item.after_Tax_Total ?? item.afterTaxTotal ?? 0),
      chargeableAmount: Number(item.chargeable_Amount ?? item.chargeableAmount ?? 0),
      roundOff: Number(item.round_Off ?? item.roundOff ?? 0)
    };
  }

  normalizedData = computed<CustomerSaleItem[]>(() => {
    return this.reportData().map(item => this.normalizeItem(item));
  });

  // Computed badges values
  totalBillsBadge = computed(() => {
    return this.normalizedData().length;
  });

  totalAmountBadge = computed(() => {
    return this.totalAmountSum();
  });

  totalCustomersBadge = computed(() => {
    const data = this.normalizedData();
    const customers = data.map(item => item.customerName.trim()).filter(name => name.length > 0);
    return new Set(customers).size;
  });

  // Computed totals for table footer
  totalAmountSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.totalAmount, 0));
  totalDiscountSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.discountAmount, 0));
  totalTaxableAmountSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.taxableAmount, 0));
  totalCgstSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.cgst, 0));
  totalSgstSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.sgst, 0));
  totalIgstSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.igst, 0));
  totalAfterTaxTotalSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.afterTaxTotal, 0));
  totalChargeableAmountSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.chargeableAmount, 0));
  totalRoundOffSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.roundOff, 0));

  // Computed paginated view of active data
  paginatedData = computed(() => {
    const data = this.normalizedData();
    const size = this.pageSize();
    const pageIndex = this.currentPage();
    const start = pageIndex * size;
    const end = start + size;
    return data.slice(start, end);
  });

  // Mat-table columns configuration
  displayedColumns: string[] = [
    'customerDetails',
    'billDetails',
    'totalAmount',
    'discountAmount',
    'taxableAmount',
    'cgst',
    'sgst',
    'igst',
    'afterTaxTotal',
    'roundOff',
    'finalAmount'
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

    // Automatically fetch reports on page load
    this.fetchReport();
  }

  fetchCustomers(orgId: number) {
    this.apiService.get<any>(`api/v1/report/customers?organizationId=${orgId}`).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.customersList.set(res.data);
        } else if (Array.isArray(res)) {
          this.customersList.set(res);
        }
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

    const userId = this.currentUser()?.userId || this.currentUser()?.userid || 0;

    const payload = {
      FromDate: fromDate.split('T')[0],
      ToDate: toDate.split('T')[0],
      UserId: userId,
      CustomerId: this.customerId()
    };

    this.isLoading.set(true);

    const headers = new HttpHeaders({
      'X-Skip-Loader': 'true'
    });

    this.apiService.post<any>('api/v1/report/customer-wise-sale_V1', payload, headers).subscribe({
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
        console.error('Failed to fetch customer wise sale report:', err);
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
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, -1);
    return localISOTime;
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

  exportToExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Customer', 'Bill / Date', 'Total (₹)', 'Discount (₹)', 'Taxable (₹)',
      'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'After Tax (₹)', 'Round Off', 'Final (₹)'
    ];

    const rows = data.map(item => [
      `${item.customerName} (ID: ${item.customerId})`,
      `${item.billNumber} / ${item.billDate}`,
      item.totalAmount,
      item.discountAmount,
      item.taxableAmount,
      item.cgst,
      item.sgst,
      item.igst,
      item.afterTaxTotal,
      item.roundOff,
      item.chargeableAmount // using chargeableAmount for Final Amount
    ]);

    const footerRow = [
      'Total:', '',
      this.totalAmountSum(),
      this.totalDiscountSum(),
      this.totalTaxableAmountSum(),
      this.totalCgstSum(),
      this.totalSgstSum(),
      this.totalIgstSum(),
      this.totalAfterTaxTotalSum(),
      this.totalRoundOffSum(),
      this.totalChargeableAmountSum()
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const metaInfo = [
      { label: 'Total Bill', value: String(this.totalBillsBadge()) },
      { label: 'Total Customers', value: String(this.totalCustomersBadge()) },
      { label: 'Total Amount', value: 'Rs. ' + Number(this.totalAmountBadge()).toFixed(2) }
    ];

    this.exportService.exportToExcel({
      title: 'Customer Wise Sale Report',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Customer_Wise_Sale_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Customer', 'Bill / Date', 'Total (₹)', 'Discount (₹)', 'Taxable (₹)',
      'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'After Tax (₹)', 'Round Off', 'Final (₹)'
    ];

    const rows = data.map(item => [
      `${item.customerName} (ID: ${item.customerId})`,
      `${item.billNumber} / ${item.billDate}`,
      'Rs. ' + item.totalAmount.toFixed(2),
      'Rs. ' + item.discountAmount.toFixed(2),
      'Rs. ' + item.taxableAmount.toFixed(2),
      'Rs. ' + item.cgst.toFixed(2),
      'Rs. ' + item.sgst.toFixed(2),
      'Rs. ' + item.igst.toFixed(2),
      'Rs. ' + item.afterTaxTotal.toFixed(2),
      'Rs. ' + item.roundOff.toFixed(2),
      'Rs. ' + item.chargeableAmount.toFixed(2)
    ]);

    const footerRow = [
      'Total:', '',
      'Rs. ' + this.totalAmountSum().toFixed(2),
      'Rs. ' + this.totalDiscountSum().toFixed(2),
      'Rs. ' + this.totalTaxableAmountSum().toFixed(2),
      'Rs. ' + this.totalCgstSum().toFixed(2),
      'Rs. ' + this.totalSgstSum().toFixed(2),
      'Rs. ' + this.totalIgstSum().toFixed(2),
      'Rs. ' + this.totalAfterTaxTotalSum().toFixed(2),
      'Rs. ' + this.totalRoundOffSum().toFixed(2),
      'Rs. ' + this.totalChargeableAmountSum().toFixed(2)
    ];

    const columnAlignments: ('center' | 'left' | 'right')[] = [
      'left', 'center', 'right', 'right', 'right',
      'right', 'right', 'right', 'right', 'right', 'right'
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';
    const metaInfo = [
      { label: 'Total Bill', value: String(this.totalBillsBadge()) },
      { label: 'Total Customers', value: String(this.totalCustomersBadge()) },
      { label: 'Total Amount', value: 'Rs. ' + Number(this.totalAmountBadge()).toFixed(2) }
    ];

    this.exportService.exportToPdf({
      title: 'Customer Wise Sale Report',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Customer_Wise_Sale_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.pdf`
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }
}
