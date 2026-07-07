import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule, Loader, Receipt, Calendar, Search, RotateCcw, FileSpreadsheet, FileText, Users } from 'lucide-angular';
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

export interface PartyBalanceItem {
  partyName?: string;
  mobileNumber?: string;
  openingBalance?: string | number;
  transactionDate?: string;
  description?: string;
  credit: number;
  debit: number;
  closingBalance: string | number;
}

@Component({
  selector: 'app-all-party-balance',
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
  templateUrl: './all-party-balance.html',
  styleUrl: './all-party-balance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllPartyBalance implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly LoaderIcon = Loader;
  readonly ReceiptIcon = Receipt;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly UsersIcon = Users;

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  customerId = signal<number>(0); // 0 means all customers
  activeCustomerId = signal<number>(0); // Used for table layout updates on search
  maxDate = new Date();

  reportType = signal<string>('All Party Balance');
  reportTypes = ['All Party Balance'];

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);
  customersList = signal<any[]>([]);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Report results from API
  reportData = signal<PartyBalanceItem[]>([]);

  normalizedData = computed<PartyBalanceItem[]>(() => {
    return this.reportData();
  });

  // Computed badges values
  totalPartiesBadge = computed(() => {
    return this.normalizedData().length;
  });

  totalCreditSum = computed(() => this.normalizedData().reduce((sum, item) => sum + (item.credit || 0), 0));
  totalDebitSum = computed(() => this.normalizedData().reduce((sum, item) => sum + (item.debit || 0), 0));

  // Computed paginated view of active data
  paginatedData = computed(() => {
    const data = this.normalizedData();
    const size = this.pageSize();
    const pageIndex = this.currentPage();
    const start = pageIndex * size;
    const end = start + size;
    return data.slice(start, end);
  });

  // Computed Mat-table columns configuration
  displayedColumns = computed(() => {
    if (this.activeCustomerId() === 0) {
      return ['srNo', 'partyName', 'mobileNumber', 'openingBalance', 'credit', 'debit', 'closingBalance'];
    } else {
      return ['srNo', 'transactionDate', 'description', 'debit', 'credit', 'closingBalance'];
    }
  });

  ngOnInit() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.fromDateObj.set(firstDayOfMonth);
    this.toDateObj.set(today);
    this.fromDate.set(this.formatToIsoString(firstDayOfMonth, false));
    this.toDate.set(this.formatToIsoString(today, true));

    const userStr = localStorage.getItem('user');
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
        let customers = [];
        if (res && res.data) {
          customers = res.data;
        } else if (Array.isArray(res)) {
          customers = res;
        }

        // Prevent duplicate "All" options if the API already returns one
        const hasAllOption = customers.some((c: any) => c.id === 0 || (c.name && c.name.toLowerCase() === 'all') || (c.customerName && c.customerName.toLowerCase() === 'all'));

        if (hasAllOption) {
          this.customersList.set([...customers]);
        } else {
          this.customersList.set([{ id: 0, name: 'All' }, ...customers]);
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

    const cleanFromDate = fromDate.split('T')[0];
    const cleanToDate = toDate.split('T')[0];
    const custId = this.customerId();

    // Update active customer ID so the table layout changes
    this.activeCustomerId.set(custId);

    this.isLoading.set(true);

    this.apiService.get<any>(`api/v1/report/GetPartyBalance?FromDate=${cleanFromDate}&ToDate=${cleanToDate}&CustomerId=${custId}`).subscribe({
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
        console.error('Failed to fetch party balance report:', err);
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

    const isAll = this.activeCustomerId() === 0;

    const headers = isAll
      ? ['Sr. No.', 'Party Name', 'Mobile No.', 'Opening Balance', 'Credit', 'Debit', 'Closing Balance']
      : ['Sr. No.', 'Transaction Date', 'Description', 'Debit', 'Credit', 'Closing Balance'];

    const rows = data.map((item, index) => {
      if (isAll) {
        return [
          index + 1,
          item.partyName || '-',
          item.mobileNumber || '-',
          item.openingBalance || '-',
          item.credit,
          item.debit,
          item.closingBalance
        ];
      } else {
        return [
          index + 1,
          item.transactionDate ? new Date(item.transactionDate).toLocaleDateString('en-GB') : '-',
          item.description || '-',
          item.debit,
          item.credit,
          item.closingBalance
        ];
      }
    });

    const footerRow = isAll
      ? ['Total:', '', '', '', this.totalCreditSum(), this.totalDebitSum(), '']
      : ['Total:', '', '', this.totalDebitSum(), this.totalCreditSum(), ''];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];

    const selectedCustId = this.activeCustomerId();
    let selectedPartyName = 'All Parties';
    if (selectedCustId > 0) {
      const found = this.customersList().find(c => c.id === selectedCustId);
      if (found) {
        selectedPartyName = found.name || found.customerName || selectedCustId.toString();
      }
    }

    const metaInfo = [
      { label: 'Party Filter', value: selectedPartyName },
      { label: 'Total Parties', value: String(this.totalPartiesBadge()) },
      { label: 'Total Credit', value: 'Rs. ' + Number(this.totalCreditSum()).toFixed(2) },
      { label: 'Total Debit', value: 'Rs. ' + Number(this.totalDebitSum()).toFixed(2) }
    ];

    this.exportService.exportToExcel({
      title: 'Party Balance Report',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Party_Balance_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const isAll = this.activeCustomerId() === 0;

    const headers = isAll
      ? ['Sr. No.', 'Party Name', 'Mobile No.', 'Opening Balance', 'Credit', 'Debit', 'Closing Balance']
      : ['Sr. No.', 'Transaction Date', 'Description', 'Debit', 'Credit', 'Closing Balance'];

    const rows = data.map((item, index) => {
      if (isAll) {
        return [
          index + 1,
          item.partyName || '-',
          item.mobileNumber || '-',
          item.openingBalance || '-',
          'Rs. ' + (item.credit || 0).toFixed(2),
          'Rs. ' + (item.debit || 0).toFixed(2),
          item.closingBalance
        ];
      } else {
        return [
          index + 1,
          item.transactionDate ? new Date(item.transactionDate).toLocaleDateString('en-GB') : '-',
          item.description || '-',
          'Rs. ' + (item.debit || 0).toFixed(2),
          'Rs. ' + (item.credit || 0).toFixed(2),
          item.closingBalance
        ];
      }
    });

    const footerRow = isAll
      ? ['Total:', '', '', '', 'Rs. ' + this.totalCreditSum().toFixed(2), 'Rs. ' + this.totalDebitSum().toFixed(2), '']
      : ['Total:', '', '', 'Rs. ' + this.totalDebitSum().toFixed(2), 'Rs. ' + this.totalCreditSum().toFixed(2), ''];

    const columnAlignments: ('center' | 'left' | 'right')[] = isAll
      ? ['center', 'left', 'center', 'right', 'right', 'right', 'right']
      : ['center', 'center', 'left', 'right', 'right', 'right'];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    const selectedCustId = this.activeCustomerId();
    let selectedPartyName = 'All Parties';
    if (selectedCustId > 0) {
      const found = this.customersList().find(c => c.id === selectedCustId);
      if (found) {
        selectedPartyName = found.name || found.customerName || selectedCustId.toString();
      }
    }

    const metaInfo = [
      { label: 'Party Filter', value: selectedPartyName },
      { label: 'Total Parties', value: String(this.totalPartiesBadge()) },
      { label: 'Total Credit', value: 'Rs. ' + Number(this.totalCreditSum()).toFixed(2) },
      { label: 'Total Debit', value: 'Rs. ' + Number(this.totalDebitSum()).toFixed(2) }
    ];

    this.exportService.exportToPdf({
      title: 'Party Balance Report',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Party_Balance_Report_${cleanFromDate || 'all'}_to_${cleanToDate || 'all'}.pdf`
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
  }
}
