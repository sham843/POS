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

export interface GstReportItem {
  billDate: string;
  billNo: number;
  totalAmount: number;
  discount: number;
  zero: number;
  five: number;
  twelve: number;
  eighteen: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  afterTaxTotal: number;
  chargeableAmount: number;
  roundOff: number;
  userName: string;
}

@Component({
  selector: 'app-gst-report',
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
  templateUrl: './gst-report.html',
  styleUrl: './gst-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GstReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly LoaderIcon = Loader;
  readonly ReceiptIcon = Receipt;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly HeaderIcon = FileText;

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  invoiceId = signal<string>(''); // Filter by invoice ID
  maxDate = new Date();

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5); // Standard is 10 as per UI screenshot

  // Report results from API
  reportData = signal<any[]>([]);

  normalizeItem(item: any): GstReportItem {
    return {
      billDate: item.billDate || '',
      billNo: Number(item.billNo || item.bill_Number || 0),
      totalAmount: Number(item.totalAmount || item.total_Amount || 0),
      discount: Number(item.discount || item.discount_Amount || 0),
      zero: Number(item.zero || 0),
      five: Number(item.five || 0),
      twelve: Number(item.twelve || 0),
      eighteen: Number(item.eighteen || 0),
      taxableAmount: Number(item.taxableAmount || item.taxable_Amount || 0),
      cgst: Number(item.cgst || item.Cgst || 0),
      sgst: Number(item.sgst || item.Sgst || 0),
      igst: Number(item.igst || item.Igst || 0),
      afterTaxTotal: Number(item.afterTaxTotal || item.after_Tax_Total || 0),
      chargeableAmount: Number(item.chargeableAmount || item.chargeable_Amount || 0),
      roundOff: Number(item.roundOff || item.round_Off || 0),
      userName: item.userName || item.user_Name || item.customerName || item.customer_Name || '-'
    };
  }

  normalizedData = computed<GstReportItem[]>(() => {
    return this.reportData().map(item => this.normalizeItem(item));
  });

  // Computed badges values
  totalBillsBadge = computed(() => {
    return this.normalizedData().length;
  });

  totalAmountBadge = computed(() => {
    return this.totalAmountSum();
  });

  // Computed totals for table footer
  totalAmountSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.totalAmount, 0));
  totalDiscountSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.discount, 0));
  totalZeroSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.zero, 0));
  totalFiveSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.five, 0));
  totalTwelveSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.twelve, 0));
  totalEighteenSum = computed(() => this.normalizedData().reduce((sum, item) => sum + item.eighteen, 0));
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
    'srNo',
    'billDetails',
    'totalAmount',
    'discount',
    'zero',
    'five',
    'twelve',
    'eighteen',
    'taxableAmount',
    'cgst',
    'sgst',
    'igst',
    'afterTaxTotal',
    'chargeableAmount',
    'roundOff',
    'finalTotal',
    'userName'
  ];

  ngOnInit() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatToIsoString(firstDayOfMonth, false));
    this.toDate.set(this.formatToIsoString(today, true));

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
      } catch (e) {
        console.error('Failed to parse user from local storage');
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

    const cleanFromDate = fromDate.split('T')[0];
    const cleanToDate = toDate.split('T')[0];
    const invId = this.invoiceId();

    this.isLoading.set(true);

    this.apiService.get<any>(`api/v1/report/GetGstReport?InvoiceId=${invId}&FromDate=${cleanFromDate}&ToDate=${cleanToDate}`).subscribe({
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
        console.error('Failed to fetch GST report:', err);
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
    this.invoiceId.set('');
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
      'Sr. No.', 'Bill Date', 'Bill No', 'Total Amount', 'Discount', '0%', '5%', '12%', '18%',
      'Taxable Amount', 'CGST', 'SGST', 'IGST', 'After Tax Total', 'Chargeable Amount', 'RoundOff', 'Final Total', 'User Name'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.billDate ? new Date(item.billDate).toLocaleString('en-GB') : '-',
      item.billNo,
      item.totalAmount,
      item.discount,
      item.zero,
      item.five,
      item.twelve,
      item.eighteen,
      item.taxableAmount,
      item.cgst,
      item.sgst,
      item.igst,
      item.afterTaxTotal,
      item.chargeableAmount,
      item.roundOff,
      item.chargeableAmount,
      item.userName
    ]);

    const footerRow = [
      'Total:', '', '',
      this.totalAmountSum(),
      this.totalDiscountSum(),
      this.totalZeroSum(),
      this.totalFiveSum(),
      this.totalTwelveSum(),
      this.totalEighteenSum(),
      this.totalTaxableAmountSum(),
      this.totalCgstSum(),
      this.totalSgstSum(),
      this.totalIgstSum(),
      this.totalAfterTaxTotalSum(),
      this.totalChargeableAmountSum(),
      this.totalRoundOffSum(),
      this.totalChargeableAmountSum(),
      ''
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const metaInfo = [
      { label: 'Total Bills', value: String(this.totalBillsBadge()) },
      { label: 'Total Amount', value: 'Rs. ' + Number(this.totalAmountBadge()).toFixed(2) }
    ];

    this.exportService.exportToExcel({
      title: 'GST Report',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `GST_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr No.', 'Date', 'Bill No', 'Total', 'Disc', '0%', '5%', '12%', '18%',
      'Taxable', 'CGST', 'SGST', 'IGST', 'After Tax', 'Chargeable', 'RoundOff', 'Final', 'User'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.billDate ? new Date(item.billDate).toLocaleDateString('en-GB') : '-',
      item.billNo,
      item.totalAmount.toFixed(2),
      item.discount.toFixed(2),
      item.zero.toFixed(2),
      item.five.toFixed(2),
      item.twelve.toFixed(2),
      item.eighteen.toFixed(2),
      item.taxableAmount.toFixed(2),
      item.cgst.toFixed(2),
      item.sgst.toFixed(2),
      item.igst.toFixed(2),
      item.afterTaxTotal.toFixed(2),
      item.chargeableAmount.toFixed(2),
      item.roundOff.toFixed(2),
      item.chargeableAmount.toFixed(2),
      item.userName
    ]);

    const footerRow = [
      'Total:', '', '',
      this.totalAmountSum().toFixed(2),
      this.totalDiscountSum().toFixed(2),
      this.totalZeroSum().toFixed(2),
      this.totalFiveSum().toFixed(2),
      this.totalTwelveSum().toFixed(2),
      this.totalEighteenSum().toFixed(2),
      this.totalTaxableAmountSum().toFixed(2),
      this.totalCgstSum().toFixed(2),
      this.totalSgstSum().toFixed(2),
      this.totalIgstSum().toFixed(2),
      this.totalAfterTaxTotalSum().toFixed(2),
      this.totalChargeableAmountSum().toFixed(2),
      this.totalRoundOffSum().toFixed(2),
      this.totalChargeableAmountSum().toFixed(2),
      ''
    ];

    // Align all numerical columns to the right
    const columnAlignments: ('center' | 'left' | 'right')[] = [
      'center', 'left', 'center', 'right', 'right', 'right', 'right', 'right', 'right',
      'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'left'
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    const metaInfo = [
      { label: 'Total Bills', value: String(this.totalBillsBadge()) },
      { label: 'Total Amount', value: 'Rs. ' + Number(this.totalAmountBadge()).toFixed(2) }
    ];

    this.exportService.exportToPdf({
      title: 'GST Report',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `GST_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.pdf`
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }
}
