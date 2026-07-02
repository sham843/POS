import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, User, Loader } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-user-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, MatPaginatorModule],
  templateUrl: './user-report.html',
  styleUrl: './user-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserReport implements OnInit {
  private apiService = inject(ApiService);

  readonly UserIcon = User;
  readonly LoaderIcon = Loader;

  // Filters State
  fromDate = signal<string>('2025-02-04');
  toDate = signal<string>('2026-07-02');
  selectedUser = signal<string>('all');
  
  isLoading = signal<boolean>(false);
  currentUser = signal<any>(null);

  // Pagination State
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  // Dynamic user list for dropdown selector
  userList = signal<any[]>([]);

  // Report results from API
  reportData = signal<any[]>([]);

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

    this.apiService.post<any>('api/v1/report/user-wise-sale', payload).subscribe({
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
