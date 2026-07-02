import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, User, Loader, Receipt, Calendar } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';

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
    MatNativeDateModule,
    MatTableModule
  ],
  templateUrl: './user-report.html',
  styleUrl: './user-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserReport implements OnInit {
  private apiService = inject(ApiService);

  readonly UserIcon = User;
  readonly LoaderIcon = Loader;
  readonly ReceiptIcon = Receipt;
  readonly CalendarIcon = Calendar;

  // Filter Date Objects (for mat-datepicker)
  fromDateObj = signal<Date>(new Date('2025-02-04'));
  toDateObj = signal<Date>(new Date('2026-07-02'));

  // Formatted Filter Strings (for API payload)
  fromDate = signal<string>('2025-02-04');
  toDate = signal<string>('2026-07-02');
  selectedUser = signal<string>('all');

  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(5);

  // Dynamic user list for dropdown selector
  userList = signal<any[]>([]);

  // Report results from API
  reportData = signal<any[]>([]);

  // Mat-table columns configuration
  displayedColumns: string[] = [
    'billDetails',
    'customerName',
    'totalAmount',
    'discount',
    'taxableAmount',
    'cgst',
    'sgst',
    'igst',
    'afterTaxTotal',
    'chargeableAmount',
    'roundOff'
  ];

  // Computed paginated view of active data
  paginatedData = computed(() => {
    const data = this.reportData();
    const size = this.pageSize();
    const pageIndex = this.currentPage();
    const start = pageIndex * size;
    const end = start + size;
    return data.slice(start, end);
  });

  ngOnInit() {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);

        const currentUserId = user.id || user.UserId || 620;
        const currentUserName = user.name || 'Pravin Varpe';

        this.userList.set([{ id: currentUserId, name: currentUserName }]);
      } catch (e) {
        console.error('Failed to parse user details:', e);
        this.userList.set([{ id: 620, name: 'Pravin Varpe' }]);
      }
    } else {
      this.userList.set([{ id: 620, name: 'Pravin Varpe' }]);
    }

    this.fetchReport();
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

    this.apiService.post<any>('api/v1/report/user-wise-sale', payload, headers).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.reportData.set(response.data);
        } else {
          this.reportData.set([]);
        }
        this.currentPage.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch user-wise sale report:', err);
        this.reportData.set([]);
        this.currentPage.set(0);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    this.fetchReport();
  }

  onFromDateChange(date: Date) {
    if (date) {
      this.fromDateObj.set(date);
      this.fromDate.set(this.formatDate(date));
      this.onFilterChange();
    }
  }

  onToDateChange(date: Date) {
    if (date) {
      this.toDateObj.set(date);
      this.toDate.set(this.formatDate(date));
      this.onFilterChange();
    }
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
