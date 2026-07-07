import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule, Loader, Calendar, Search, RotateCcw, FileSpreadsheet, FileText, Receipt, Hash, Users, CreditCard } from 'lucide-angular';
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

export interface InvoiceReportItem {
  partyId: number;
  partyName: string;
  billNo: string | number;
  billDate: string;
  totalSubTotal: number | string;
  totalDiscount: number | string;
  totalGST: number | string;
  roundOff: number | string;
  totalAmount: number | string;
  modifiedDate?: string;
  modeOfPayment?: string;
}

@Component({
  selector: 'app-sales-invoice-report',
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
  templateUrl: './sales-invoice-report.html',
  styleUrl: './sales-invoice-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesInvoiceReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly LoaderIcon = Loader;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly ReceiptIcon = Receipt;
  readonly HashIcon = Hash;
  readonly UsersIcon = Users;
  readonly CardIcon = CreditCard;

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  userId = signal<number>(0);

  maxDate = new Date();

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  usersList = signal<any[]>([{ id: 0, name: 'All Users' }]);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Report results from API
  reportData = signal<InvoiceReportItem[]>([]);

  normalizeItem(item: any): InvoiceReportItem {
    return {
      partyId: item.partyId || 0,
      partyName: item.partyName || '',
      billNo: item.billNo || '',
      billDate: item.billDate || '',
      totalSubTotal: item.totalSubTotal || '0.00',
      totalDiscount: item.totalDiscount || '0.00',
      totalGST: item.totalGST || '0.00',
      roundOff: item.roundOff || 0,
      totalAmount: item.totalAmount || 0,
      modifiedDate: item.modifiedDate || '',
      modeOfPayment: item.modeOfPayment || ''
    };
  }

  // Normalized data for template and export
  normalizedData = computed<InvoiceReportItem[]>(() => {
    return this.reportData().map(item => this.normalizeItem(item));
  });

  // Computed Totals for Footer
  totals = computed(() => {
    let subTotal = 0;
    let discount = 0;
    let gst = 0;
    let roundOff = 0;
    let amount = 0;

    const data = this.normalizedData();
    data.forEach(item => {
      subTotal += (Number(item.totalSubTotal) || 0);
      discount += (Number(item.totalDiscount) || 0);
      gst += (Number(item.totalGST) || 0);
      roundOff += (Number(item.roundOff) || 0);
      amount += (Number(item.totalAmount) || 0);
    });

    return {
      subTotal,
      discount,
      gst,
      roundOff,
      amount
    };
  });

  // Computed badges values
  totalBillsBadge = computed(() => {
    return this.reportData().length;
  });

  totalAmountBadge = computed(() => {
    return this.totals().amount;
  });

  totalCustomersBadge = computed(() => {
    const data = this.normalizedData();
    const customers = data.map(item => item.partyName.trim()).filter(name => name.length > 0);
    return new Set(customers).size;
  });

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
    'partyDetails',
    'billDetails',
    'modifiedDate',
    'modeOfPayment',
    'totalSubTotal',
    'totalDiscount',
    'totalGST',
    'roundOff',
    'totalAmount'
  ];

  ngOnInit() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatDate(firstDayOfMonth));
    this.toDate.set(this.formatDate(today));

    const userStr = localStorage.getItem('UserDetails');
    let orgId = 0;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
        orgId = user.organizationId || user.organizationid || user.OrganizationId || 0;
      } catch (e) {
        console.error('Failed to parse user details:', e);
      }
    }

    this.fetchUsers(orgId);
    this.searchReport();
  }

  fetchUsers(orgId: number) {
    this.apiService.get<any>(`api/v1/report/users?organizationId=${orgId}`).subscribe({
      next: (response) => {
        let usersData = [];
        if (response && response.data) {
          usersData = response.data;
        } else if (response && Array.isArray(response)) {
          usersData = response;
        }

        if (usersData && usersData.length > 0) {
          let mappedUsers = usersData.map((u: any) => ({
            id: u.id || u.Id || u.userId || u.UserId || 0,
            name: u.name || u.Name || u.userName || u.UserName || ''
          }));

          const allIndex = mappedUsers.findIndex((c: any) => c.id === 0 || (c.name && c.name.toLowerCase() === 'all'));
          if (allIndex !== -1) {
            mappedUsers[allIndex] = { ...mappedUsers[allIndex], name: 'All Users' };
          } else {
            mappedUsers = [{ id: 0, name: 'All Users' }, ...mappedUsers];
          }

          this.usersList.set(mappedUsers);
        }
      },
      error: (err) => console.error('Error fetching users', err)
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onFromDateChange(date: Date | null) {
    this.fromDateObj.set(date);
    if (date) {
      this.fromDate.set(this.formatDate(date));
    } else {
      this.fromDate.set('');
    }
  }

  onToDateChange(date: Date | null) {
    this.toDateObj.set(date);
    if (date) {
      this.toDate.set(this.formatDate(date));
    } else {
      this.toDate.set('');
    }
  }

  searchReport() {
    this.isLoading.set(true);

    const from = this.fromDate();
    const to = this.toDate();
    const userId = this.userId();

    const url = `api/v1/report/GetInvoiceReport?userId=${userId}&fromDate=${from}&toDate=${to}`;

    this.apiService.get<any>(url).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.reportData.set(response.data);
        } else if (Array.isArray(response)) {
          this.reportData.set(response);
        } else {
          this.reportData.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching report', err);
        this.reportData.set([]);
        this.isLoading.set(false);
      }
    });
  }

  clearFilters() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatDate(firstDayOfMonth));
    this.toDate.set(this.formatDate(today));
    this.userId.set(0);

    this.reportData.set([]);
    this.currentPage.set(0);
    this.searchReport();
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  getPaymentModeBadgeClass(mode: string | undefined): string {
    if (!mode) return 'badge-credit';
    const lMode = mode.toLowerCase();
    if (lMode.includes('cash')) return 'badge-cash';
    if (lMode.includes('cheque') || lMode.includes('neft') || lMode.includes('rtgs') || lMode.includes('upi') || lMode.includes('online')) return 'badge-online';
    return 'badge-credit';
  }

  exportExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr. No.', 'Party Id', 'Party Name', 'Bill No', 'Bill Date', 'Mode Of Payment',
      'Total Sub Total', 'Total Discount', 'Total GST', 'Round Off', 'Total Amount', 'Modified Date'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.partyId,
      item.partyName,
      item.billNo,
      item.billDate,
      item.modeOfPayment || '-',
      Number(item.totalSubTotal).toFixed(2),
      Number(item.totalDiscount).toFixed(2),
      Number(item.totalGST).toFixed(2),
      Number(item.roundOff).toFixed(2),
      Number(item.totalAmount).toFixed(2),
      item.modifiedDate || '-'
    ]);

    const totals = this.totals();
    const footerRow = [
      'Total:', '', '', '', '', '',
      totals.subTotal.toFixed(2),
      totals.discount.toFixed(2),
      totals.gst.toFixed(2),
      totals.roundOff.toFixed(2),
      totals.amount.toFixed(2),
      ''
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];

    const metaInfo: any[] = [{ label: 'Total Records', value: String(data.length) }];
    const userObj = this.usersList().find(c => c.id === this.userId());
    if (userObj && userObj.id !== 0) {
      metaInfo.unshift({ label: 'User', value: userObj.name });
    }

    this.exportService.exportToExcel({
      title: 'Sales Invoice Report',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Sales_Invoice_Report_${cleanFromDate}_to_${cleanToDate}.xlsx`
    });
  }

  exportPDF() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr.', 'Party Id', 'Party Name', 'Bill No', 'Bill Date', 'Mode Of Payment',
      'Total Sub Total', 'Total Discount', 'Total GST', 'Round Off', 'Total Amount'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.partyId,
      item.partyName,
      item.billNo,
      item.billDate,
      item.modeOfPayment || '-',
      Number(item.totalSubTotal).toFixed(2),
      Number(item.totalDiscount).toFixed(2),
      Number(item.totalGST).toFixed(2),
      Number(item.roundOff).toFixed(2),
      Number(item.totalAmount).toFixed(2)
    ]);

    const totals = this.totals();
    const footerRow = [
      'Total:', '', '', '', '', '',
      totals.subTotal.toFixed(2),
      totals.discount.toFixed(2),
      totals.gst.toFixed(2),
      totals.roundOff.toFixed(2),
      totals.amount.toFixed(2)
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    const metaInfo: any[] = [{ label: 'Total Records', value: String(data.length) }];
    const userObj = this.usersList().find(c => c.id === this.userId());
    if (userObj && userObj.id !== 0) {
      metaInfo.unshift({ label: 'User', value: userObj.name });
    }

    const columnAlignments: ('center' | 'left' | 'right')[] = [
      'center', 'center', 'left', 'center', 'center', 'left', 'right', 'right', 'right', 'right', 'right'
    ];

    this.exportService.exportToPdf({
      title: 'Sales Invoice Report',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Sales_Invoice_Report_${cleanFromDate}_to_${cleanToDate}.pdf`
    });
  }
}
