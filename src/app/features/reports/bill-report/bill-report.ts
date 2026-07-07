import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule, Loader, Receipt, Calendar, Search, RotateCcw, FileSpreadsheet, FileText } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/adapters/custom-date-adapter';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';

export interface BillSaleItem {
  billNumber: number;
  invoiceNumber: string;
  billDate: string;
  customerName: string;
  paymentMode: string;
  totalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  afterTaxTotal: number;
  chargeableAmount: number;
  roundOff: number;
  modeOfPayment: string
}

@Component({
  selector: 'app-bill-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTableModule,
    EmptyState
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './bill-report.html',
  styleUrl: './bill-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BillReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

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

  // Formatted ISO Date Strings (for API parameters)
  fromDate = signal<string>('');
  toDate = signal<string>('');
  maxDate = new Date();

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Report results from API
  reportData = signal<any[]>([]);
  summaryInfo = signal<{ totalBills: number; totalAmount: number } | null>(null);

  normalizeBillData(item: any): BillSaleItem {
    return {
      billNumber: Number(item.bill_Number ?? item.billNumber ?? item.id ?? 0),
      invoiceNumber: item.invoice_Number ?? item.invoiceNumber ?? '',
      billDate: item.bill_Date ?? item.billDate ?? '',
      customerName: item.customer_Name ?? item.customerName ?? '',
      modeOfPayment: item.modeOfPayment ?? item.modeOfPayment ?? '',
      paymentMode: item.payment_Mode ?? item.paymentMode ?? '',
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

  // Normalized report data
  normalizedData = computed<BillSaleItem[]>(() => {
    return this.reportData().map(item => this.normalizeBillData(item));
  });

  // Computed badges values
  totalBillsBadge = computed(() => {
    return this.summaryInfo()?.totalBills ?? this.reportData().length;
  });

  totalAmountBadge = computed(() => {
    return this.summaryInfo()?.totalAmount ?? this.totalAmountSum();
  });

  totalCustomersBadge = computed(() => {
    const data = this.normalizedData();
    const customers = data.map(item => item.customerName.trim()).filter(name => name.length > 0);
    return new Set(customers).size;
  });

  // Computed totals for table footer
  totalAmountSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.totalAmount, 0);
  });

  totalDiscountSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.discountAmount, 0);
  });

  totalTaxableAmountSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.taxableAmount, 0);
  });

  totalCgstSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.cgst, 0);
  });

  totalSgstSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.sgst, 0);
  });

  totalIgstSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.igst, 0);
  });

  totalAfterTaxTotalSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.afterTaxTotal, 0);
  });

  totalChargeableAmountSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.chargeableAmount, 0);
  });

  totalRoundOffSum = computed(() => {
    return this.normalizedData().reduce((sum, item) => sum + item.roundOff, 0);
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

  // Mat-table columns configuration
  displayedColumns: string[] = [
    'billDetails',
    'customerName',
    'totalAmount',
    'discountAmount',
    'taxableAmount',
    'cgst',
    'sgst',
    'igst',
    'afterTaxTotal',
    'chargeableAmount',
    'roundOff'
  ];

  ngOnInit() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatToIsoString(firstDayOfMonth, false));
    this.toDate.set(this.formatToIsoString(today, true));

    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
      } catch (e) {
        console.error('Failed to parse user details:', e);
      }
    }
    
    // Automatically fetch reports on page load
    this.fetchReport();
  }

  fetchReport() {
    const fromDate = this.fromDate();
    const toDate = this.toDate();

    if (!fromDate || !toDate) {
      return;
    }

    this.isLoading.set(true);

    const endpoint = `api/v1/report/GetBillWiseSale?fromDate=${fromDate}&toDate=${toDate}`;

    this.apiService.get<any>(endpoint).subscribe({
      next: (response) => {
        if (response) {
          if (response.data) {
            this.reportData.set(response.data);
          } else {
            this.reportData.set([]);
          }

          if (response.billWiseSummary) {
            this.summaryInfo.set(response.billWiseSummary);
          } else {
            this.summaryInfo.set(null);
          }
        } else {
          this.reportData.set([]);
          this.summaryInfo.set(null);
        }
        this.currentPage.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch bill wise sale report:', err);
        this.reportData.set([]);
        this.summaryInfo.set(null);
        this.currentPage.set(0);
        this.isLoading.set(false);
      }
    });
  }

  searchReport() {
    this.fetchReport();
  }

  getPaymentMode(item: any): string {
    return item.modeOfPayment;
  }

  clearFilters() {
    this.fromDateObj.set(null);
    this.toDateObj.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.reportData.set([]);
    this.summaryInfo.set(null);
  }

  formatToIsoString(date: Date, isEndDate: boolean): string {
    const d = new Date(date);
    if (isEndDate) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d.toISOString();
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
      const currentFrom = this.fromDateObj();
      if (currentFrom && date < currentFrom) {
        this.fromDateObj.set(date);
        this.fromDate.set(this.formatToIsoString(date, false));
      }
    } else {
      this.toDate.set('');
    }
  }

  exportToExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) {
      return;
    }

    const headers = [
      'Bill Number',
      'Bill Date',
      'Customer Name',
      'Payment Mode',
      'Total Amount (INR)',
      'Discount Amount (INR)',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'After Tax Total (INR)',
      'Chargeable Amount (INR)',
      'Round Off (INR)'
    ];

    const rows = data.map(item => [
      item.billNumber,
      item.billDate,
      item.customerName,
      item.paymentMode,
      item.totalAmount,
      item.discountAmount,
      item.taxableAmount,
      item.cgst,
      item.sgst,
      item.igst,
      item.afterTaxTotal,
      item.chargeableAmount,
      item.roundOff
    ]);

    const footerRow = [
      'Total:',
      '',
      '',
      '',
      this.totalAmountSum(),
      this.totalDiscountSum(),
      this.totalTaxableAmountSum(),
      this.totalCgstSum(),
      this.totalSgstSum(),
      this.totalIgstSum(),
      this.totalAfterTaxTotalSum(),
      this.totalChargeableAmountSum(),
      this.totalRoundOffSum()
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];

    const metaInfo = [
      { label: 'Total Bill', value: String(this.totalBillsBadge()) },
      { label: 'Total Customers', value: String(this.totalCustomersBadge()) },
      { label: 'Total Amount', value: 'Rs. ' + Number(this.totalAmountBadge()).toFixed(2) }
    ];

    this.exportService.exportToExcel({
      title: 'Bill Wise Sale Report',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Bill_Wise_Sale_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.normalizedData();
    if (!data || data.length === 0) {
      return;
    }

    const headers = [
      'Bill No',
      'Bill Date',
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

    const rows = data.map(item => [
      item.billNumber,
      item.billDate,
      item.customerName,
      item.paymentMode,
      'Rs. ' + item.totalAmount.toFixed(2),
      'Rs. ' + item.discountAmount.toFixed(2),
      'Rs. ' + item.taxableAmount.toFixed(2),
      'Rs. ' + item.cgst.toFixed(2),
      'Rs. ' + item.sgst.toFixed(2),
      'Rs. ' + item.igst.toFixed(2),
      'Rs. ' + item.afterTaxTotal.toFixed(2),
      'Rs. ' + item.chargeableAmount.toFixed(2),
      'Rs. ' + item.roundOff.toFixed(2)
    ]);

    const footerRow = [
      'Total:',
      '',
      '',
      '',
      'Rs. ' + this.totalAmountSum().toFixed(2),
      'Rs. ' + this.totalDiscountSum().toFixed(2),
      'Rs. ' + this.totalTaxableAmountSum().toFixed(2),
      'Rs. ' + this.totalCgstSum().toFixed(2),
      'Rs. ' + this.totalSgstSum().toFixed(2),
      'Rs. ' + this.totalIgstSum().toFixed(2),
      'Rs. ' + this.totalAfterTaxTotalSum().toFixed(2),
      'Rs. ' + this.totalChargeableAmountSum().toFixed(2),
      'Rs. ' + this.totalRoundOffSum().toFixed(2)
    ];

    const columnAlignments: ('center' | 'left' | 'right')[] = [
      'center', // Bill No
      'center', // Date
      'left',   // Name
      'center', // Payment Mode
      'right',  // Total
      'right',  // Disc
      'right',  // Taxable
      'right',  // CGST
      'right',  // SGST
      'right',  // IGST
      'right',  // After Tax
      'right',  // Chargeable
      'right'   // Round Off
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
      title: 'Bill Wise Sale Report',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Bill_Wise_Sale_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.pdf`
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }
}
