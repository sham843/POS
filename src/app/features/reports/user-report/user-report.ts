import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, User, Loader, Receipt, Calendar, Search, RotateCcw, FileSpreadsheet, FileText } from 'lucide-angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ExportService } from '../../../core/services/export.service';

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
    MatTableModule,
    EmptyState
  ],
  templateUrl: './user-report.html',
  styleUrl: './user-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserReport implements OnInit {
  private apiService = inject(ApiService);
  private exportService = inject(ExportService);

  readonly UserIcon = User;
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

  // Formatted Filter Strings (for API payload)
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedUser = signal<string>('all');

  // Computed properties for column totals
  totalBillAmount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.totalAmount || item.TotalAmount) || 0), 0);
  });

  totalDiscount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.discount || item.Discount) || 0), 0);
  });

  totalTaxableAmount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.taxableAmount || item.TaxableAmount) || 0), 0);
  });

  totalCgst = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.cgst || item.Cgst || item.CGST) || 0), 0);
  });

  totalSgst = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.sgst || item.Sgst || item.SGST) || 0), 0);
  });

  totalIgst = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.igst || item.Igst || item.IGST) || 0), 0);
  });

  totalAfterTaxTotal = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.afterTaxTotal || item.AfterTaxTotal) || 0), 0);
  });

  totalChargeableAmount = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.chargeableAmount || item.ChargeableAmount) || 0), 0);
  });

  totalRoundOff = computed(() => {
    return this.reportData().reduce((sum, item) => sum + (Number(item.roundOff || item.RoundOff) || 0), 0);
  });

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
    'user_Name',
    'billDetails',
    'customerName',
    'totalAmount',
    'discount',
    'taxableAmount',
    'cgst',
    'sgst',
    'igst',
    'afterTaxTotal',
    'roundOff',
    'chargeableAmount'
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
    let orgId = 28; // Default orgId fallback
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);

        const currentUserId = user.id || user.UserId || 620;
        const currentUserName = user.name || 'Pravin Varpe';
        orgId = user.organizationId || user.organizationid || 28;

        this.userList.set([{ id: currentUserId, name: currentUserName }]);
      } catch (e) {
        console.error('Failed to parse user details:', e);
        this.userList.set([{ id: 620, name: 'Pravin Varpe' }]);
      }
    } else {
      this.userList.set([{ id: 620, name: 'Pravin Varpe' }]);
    }

    this.fetchUserList(orgId);
  }

  fetchUserList(orgId: number) {
    this.apiService.get<any>(`api/v1/report/users?organizationId=${orgId}`).subscribe({
      next: (response) => {
        let usersData = [];
        if (response && response.data) {
          usersData = response.data;
        } else if (response && Array.isArray(response)) {
          usersData = response;
        }

        if (usersData && usersData.length > 0) {
          const mappedUsers = usersData.map((u: any) => ({
            id: u.id || u.Id || u.userId || u.UserId || 0,
            name: u.name || u.Name || u.userName || u.UserName || ''
          }));
          this.userList.set(mappedUsers);
        }
      },
      error: (err) => {
        console.error('Failed to fetch user list from API:', err);
      }
    });
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
          console.log('API Response data sample:', response.data[0]);
          console.log('All Response data:', response.data);
          this.reportData.set(response.data);
          setTimeout(() => {
            console.log('Computed Totals Debug:', {
              totalBillAmount: this.totalBillAmount(),
              totalDiscount: this.totalDiscount(),
              totalTaxableAmount: this.totalTaxableAmount(),
              totalCgst: this.totalCgst(),
              totalSgst: this.totalSgst(),
              totalIgst: this.totalIgst(),
              totalAfterTaxTotal: this.totalAfterTaxTotal(),
              totalChargeableAmount: this.totalChargeableAmount(),
              totalRoundOff: this.totalRoundOff()
            });
          }, 200);
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

  searchReport() {
    this.fetchReport();
  }

  clearFilters() {
    this.fromDateObj.set(null);
    this.toDateObj.set(null);
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedUser.set('all');
    this.reportData.set([]);
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

  exportToExcel() {
    const data = this.reportData();
    if (!data || data.length === 0) {
      return;
    }

    const headers = [
      'User Name',
      'Bill No',
      'Bill Date',
      'Customer Name',
      'Payment Mode',
      'Total Amount (INR)',
      'Discount (INR)',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'After Tax Total (INR)',
      'Chargeable Amount (INR)',
      'Round Off (INR)'
    ];

    const rows = data.map(item => [
      item.user_Name || '',
      item.bill_Number || '',
      item.bill_Date || '',
      item.customer_Name || '',
      this.getPaymentMode(item) || '',
      item.totalAmount || item.TotalAmount || 0,
      item.discount || item.Discount || 0,
      item.taxableAmount || item.TaxableAmount || 0,
      item.cgst || item.Cgst || item.CGST || 0,
      item.sgst || item.Sgst || item.SGST || 0,
      item.igst || item.Igst || item.IGST || 0,
      item.afterTaxTotal || item.AfterTaxTotal || 0,
      item.chargeableAmount || item.ChargeableAmount || 0,
      item.roundOff || item.RoundOff || 0
    ]);

    const footerRow = [
      'Total:',
      '',
      '',
      '',
      '',
      this.totalBillAmount(),
      this.totalDiscount(),
      this.totalTaxableAmount(),
      this.totalCgst(),
      this.totalSgst(),
      this.totalIgst(),
      this.totalAfterTaxTotal(),
      this.totalChargeableAmount(),
      this.totalRoundOff()
    ];

    const selectedUser = this.selectedUser();
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    this.exportService.exportToExcel({
      title: 'User Wise Sale Report',
      unitName,
      periodFrom: this.fromDate() || '-',
      periodTo: this.toDate() || '-',
      metaInfo: [
        { label: 'User Filter', value: selectedUser === 'all' ? 'All Users' : selectedUser }
      ],
      headers,
      rows,
      footerRow,
      fileName: `User_Wise_Sale_Report_${this.fromDate() || 'all'}_to_${this.toDate() || 'all'}.xlsx`
    });
  }

  exportToPdf() {
    const data = this.reportData();
    if (!data || data.length === 0) {
      return;
    }

    const headers = [
      'Sr',
      'User Name',
      'Bill No / Date',
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

    const rows = data.map((item, idx) => [
      idx + 1,
      item.user_Name || '',
      `${item.bill_Number || '-'}<br/><small>${item.bill_Date || ''}</small>`,
      item.customer_Name || '-',
      this.getPaymentMode(item) || '-',
      `₹${(Number(item.totalAmount || item.TotalAmount) || 0).toFixed(2)}`,
      `₹${(Number(item.discount || item.Discount) || 0).toFixed(2)}`,
      `₹${(Number(item.taxableAmount || item.TaxableAmount) || 0).toFixed(2)}`,
      `₹${(Number(item.cgst || item.Cgst || item.CGST) || 0).toFixed(2)}`,
      `₹${(Number(item.sgst || item.Sgst || item.SGST) || 0).toFixed(2)}`,
      `₹${(Number(item.igst || item.Igst || item.IGST) || 0).toFixed(2)}`,
      `₹${(Number(item.afterTaxTotal || item.AfterTaxTotal) || 0).toFixed(2)}`,
      `₹${(Number(item.chargeableAmount || item.ChargeableAmount) || 0).toFixed(2)}`,
      `₹${(Number(item.roundOff || item.RoundOff) || 0).toFixed(2)}`
    ]);

    const footerRow = [
      'Total:',
      '',
      '',
      '',
      '',
      `₹${this.totalBillAmount().toFixed(2)}`,
      `₹${this.totalDiscount().toFixed(2)}`,
      `₹${this.totalTaxableAmount().toFixed(2)}`,
      `₹${this.totalCgst().toFixed(2)}`,
      `₹${this.totalSgst().toFixed(2)}`,
      `₹${this.totalIgst().toFixed(2)}`,
      `₹${this.totalAfterTaxTotal().toFixed(2)}`,
      `₹${this.totalChargeableAmount().toFixed(2)}`,
      `₹${this.totalRoundOff().toFixed(2)}`
    ];

    const columnAlignments: ('left' | 'center' | 'right')[] = [
      'center', // Sr
      'left',   // User Name
      'left',   // Bill No / Date
      'left',   // Customer Name
      'center', // Payment Mode
      'right',  // Total Amt
      'right',  // Disc
      'right',  // Taxable Amt
      'right',  // CGST
      'right',  // SGST
      'right',  // IGST
      'right',  // After Tax
      'right',  // Chargeable
      'right'   // Round Off
    ];

    const selectedUser = this.selectedUser();
    const unitName = this.currentUser()?.unitName || this.currentUser()?.UnitName || 'Hi-Tech Dairy Shop';

    this.exportService.exportToPdf({
      title: 'User Wise Sale Report',
      unitName,
      periodFrom: this.fromDate() || '-',
      periodTo: this.toDate() || '-',
      metaInfo: [
        { label: 'User Filter', value: selectedUser === 'all' ? 'All Users' : selectedUser }
      ],
      headers,
      rows,
      footerRow,
      columnAlignments
    });
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
