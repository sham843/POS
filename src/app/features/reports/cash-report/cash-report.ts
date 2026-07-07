import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, RotateCcw, Calendar, Loader, FileSpreadsheet, FileText, User, Receipt, Clock, Eye } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/adapters/custom-date-adapter';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';
import { CashReportViewComponent } from './components/cash-report-view/cash-report-view.component';

export interface CashReportItem {
  id?: number;
  depositDate: string;
  startTime: string;
  endTime: string;
  personName: string;
  totalAmount: number | string;
  userId?: number;
  rawDate?: string;
}

@Component({
  selector: 'app-cash-report',
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
  templateUrl: './cash-report.html',
  styleUrl: './cash-report.scss',
})
export class CashReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);
  private dialog = inject(MatDialog);

  readonly LoaderIcon = Loader;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly UserIcon = User;
  readonly ReceiptIcon = Receipt;
  readonly ClockIcon = Clock;
  readonly ListIcon = FileText;
  readonly EyeIcon = Eye;

  // Report Type
  reportType = signal<'details' | 'summary'>('details');

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  userId = signal<number>(0);
  currentUser = signal<any>(null);

  usersList = signal<any[]>([]);
  reportData = signal<CashReportItem[]>([]);
  isLoading = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  normalizedData = computed<CashReportItem[]>(() => {
    return this.reportData().map((item: any) => {
      // Extract just the time part if startTime/endTime includes a date
      const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const parts = timeStr.trim().split(' ');
        if (parts.length >= 3) {
          // Like '02-07-26 04:53 PM' -> return '04:53 PM'
          return `${parts[1]} ${parts[2]}`;
        }
        return timeStr; // Already just time '12:50 PM'
      };

      return {
        id: item.id || item.Id || 0,
        depositDate: item.depositDate || item.DepositDate || item.date || item.Date || '',
        startTime: formatTime(item.startTime || item.StartTime),
        endTime: formatTime(item.endTime || item.EndTime),
        personName: item.personName || item.PersonName || item.userName || item.UserName || item.user || item.User || '',
        totalAmount: Number(item.totalAmount || item.TotalAmount || item.totalSale || item.TotalSale || item.amount || item.Amount || 0),
        userId: item.userId || item.UserId || this.userId(),
        rawDate: item.date || item.Date || item.depositDate || item.DepositDate
      };
    });
  });

  // Computed Totals for Footer
  totals = computed(() => {
    let amount = 0;
    const data = this.normalizedData();
    data.forEach(item => {
      amount += (Number(item.totalAmount) || 0);
    });
    return { amount };
  });

  totalRecordsBadge = computed(() => {
    return this.reportData().length;
  });

  totalAmountBadge = computed(() => {
    return this.totals().amount;
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
    'depositDate',
    'personName',
    'totalAmount',
    'action'
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
      next: (res) => {
        let usersData = [];
        if (res && res.data) {
          usersData = res.data;
        } else if (Array.isArray(res)) {
          usersData = res;
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

    let url = '';
    if (this.reportType() === 'summary') {
      url = `api/v1/report/GetDailySessionSummary?userId=${userId}&date=${from}`;
    } else {
      url = `api/v1/report/GetDateWiseSessions?userId=${userId}&fromDate=${from}&toDate=${to}`;
    }

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

  setReportType(type: 'details' | 'summary') {
    if (this.reportType() === type) return;
    this.reportType.set(type);
    
    // Reset filters (which also clears page, sets default dates, and auto-searches)
    this.clearFilters();
  }

  viewDetails(item: CashReportItem) {
    this.dialog.open(CashReportViewComponent, {
      width: '1200px',
      maxWidth: '98vw',
      panelClass: 'modern-modal-panel',
      data: item
    });
  }

  exportExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr. No.', 'Deposit Date', 'User Name', 'Total Amount'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.depositDate || '-',
      item.personName || '-',
      Number(item.totalAmount).toFixed(2)
    ]);

    const totals = this.totals();
    const footerRow = [
      'Total:', '', '',
      totals.amount.toFixed(2)
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const reportLabel = this.reportType() === 'summary' ? 'Summary' : 'Details';

    const metaInfo: any[] = [{ label: 'Total Records', value: String(data.length) }];
    const userObj = this.usersList().find(c => c.id === this.userId());
    if (userObj && userObj.id !== 0) {
      metaInfo.unshift({ label: 'User', value: userObj.name });
    }

    this.exportService.exportToExcel({
      title: `Cash Report - ${reportLabel}`,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Cash_Report_${reportLabel}_${cleanFromDate}_to_${cleanToDate}.xlsx`
    });
  }

  exportPDF() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr. No.', 'Deposit Date', 'User Name', 'Total Amount'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.depositDate || '-',
      item.personName || '-',
      Number(item.totalAmount).toFixed(2)
    ]);

    const totals = this.totals();
    const footerRow = [
      'Total:', '', '',
      totals.amount.toFixed(2)
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    const reportLabel = this.reportType() === 'summary' ? 'Summary' : 'Details';

    // We don't have companyName in this component directly unless we get it from auth,
    // so we'll just pass a placeholder or get it if needed.
    const unitName = 'Hi-Tech Dairy Shop';

    const metaInfo: any[] = [{ label: 'Total Records', value: String(data.length) }];
    const userObj = this.usersList().find(c => c.id === this.userId());
    if (userObj && userObj.id !== 0) {
      metaInfo.unshift({ label: 'User', value: userObj.name });
    }

    const columnAlignments: ('center' | 'left' | 'right')[] = [
      'center', 'center', 'left', 'right'
    ];

    this.exportService.exportToPdf({
      title: `Cash Report - ${reportLabel}`,
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Cash_Report_${reportLabel}_${cleanFromDate}_to_${cleanToDate}.pdf`
    });
  }
}
