import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, RotateCcw, Calendar, Loader, FileSpreadsheet, FileText, User, Receipt } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../core/adapters/custom-date-adapter';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';

export interface CashReportItem {
  id?: number;
  depositDate: string;
  userName: string;
  totalAmount: number | string;
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

  readonly LoaderIcon = Loader;
  readonly CalendarIcon = Calendar;
  readonly SearchIcon = Search;
  readonly ClearIcon = RotateCcw;
  readonly ExcelIcon = FileSpreadsheet;
  readonly PdfIcon = FileText;
  readonly UserIcon = User;
  readonly ReceiptIcon = Receipt;

  // Filter Date Objects
  fromDateObj = signal<Date | null>(null);
  toDateObj = signal<Date | null>(null);

  // API parameters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  userId = signal<number>(0);

  usersList = signal<any[]>([]);
  reportData = signal<CashReportItem[]>([]);
  isLoading = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  normalizedData = computed<CashReportItem[]>(() => {
    return this.reportData().map((item: any) => ({
      id: item.id || item.Id || 0,
      depositDate: item.depositDate || item.DepositDate || item.date || item.Date || '',
      userName: item.userName || item.UserName || item.user || item.User || '',
      totalAmount: Number(item.totalAmount || item.TotalAmount || item.amount || item.Amount || 0)
    }));
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
    'userName',
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
    
    this.fetchUsers();
    this.searchReport();
  }

  fetchUsers() {
    this.apiService.get<any>(`api/v1/auth/users`).subscribe({
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

    const url = `api/v1/report/GetDateWiseSessions?userId=${userId}&fromDate=${from}&toDate=${to}`;

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

  exportExcel() {
    const data = this.normalizedData();
    if (!data || data.length === 0) return;

    const headers = [
      'Sr. No.', 'Deposit Date', 'User Name', 'Total Amount'
    ];

    const rows = data.map((item, index) => [
      index + 1,
      item.depositDate || '-',
      item.userName || '-',
      Number(item.totalAmount).toFixed(2)
    ]);

    const totals = this.totals();
    const footerRow = [
      'Total:', '', '',
      totals.amount.toFixed(2)
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];

    const metaInfo: any[] = [{ label: 'Total Records', value: String(data.length) }];
    const userObj = this.usersList().find(c => c.id === this.userId());
    if (userObj && userObj.id !== 0) {
      metaInfo.unshift({ label: 'User', value: userObj.name });
    }

    this.exportService.exportToExcel({
      title: 'Cash Report',
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      fileName: `Cash_Report_${cleanFromDate}_to_${cleanToDate}.xlsx`
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
      item.userName || '-',
      Number(item.totalAmount).toFixed(2)
    ]);

    const totals = this.totals();
    const footerRow = [
      'Total:', '', '',
      totals.amount.toFixed(2)
    ];

    const cleanFromDate = this.fromDate().split('T')[0];
    const cleanToDate = this.toDate().split('T')[0];
    
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
      title: 'Cash Report',
      unitName,
      periodFrom: cleanFromDate || '-',
      periodTo: cleanToDate || '-',
      metaInfo,
      headers,
      rows,
      footerRow,
      columnAlignments,
      fileName: `Cash_Report_${cleanFromDate}_to_${cleanToDate}.pdf`
    });
  }
}
