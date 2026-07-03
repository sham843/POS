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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const str = typeof val === 'string' ? val : String(val);
        const escaped = str.replace(/"/g, '""');
        return (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"'))
          ? `"${escaped}"`
          : escaped;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `User_Wise_Sale_Report_${this.fromDate()}_to_${this.toDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPdf() {
    const data = this.reportData();
    if (!data || data.length === 0) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print/export PDF.');
      return;
    }

    const fromDate = this.fromDate();
    const toDate = this.toDate();
    const selectedUser = this.selectedUser();

    const rowsHtml = data.map((item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${item.user_Name || ''}</td>
        <td>${item.bill_Number || '-'}<br/><small>${item.bill_Date || ''}</small></td>
        <td>${item.customer_Name || '-'}</td>
        <td style="text-align: center;">${this.getPaymentMode(item) || '-'}</td>
        <td style="text-align: right;">₹${(Number(item.totalAmount || item.TotalAmount) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.discount || item.Discount) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.taxableAmount || item.TaxableAmount) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.cgst || item.Cgst || item.CGST) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.sgst || item.Sgst || item.SGST) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.igst || item.Igst || item.IGST) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.afterTaxTotal || item.AfterTaxTotal) || 0).toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${(Number(item.chargeableAmount || item.ChargeableAmount) || 0).toFixed(2)}</td>
        <td style="text-align: right;">₹${(Number(item.roundOff || item.RoundOff) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const totalsHtml = `
      <tr class="totals-row">
        <td colspan="5" style="text-align: right; font-weight: bold;">Total:</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalBillAmount().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalDiscount().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalTaxableAmount().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalCgst().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalSgst().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalIgst().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalAfterTaxTotal().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold; color: #1E3A8A;">₹${this.totalChargeableAmount().toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">₹${this.totalRoundOff().toFixed(2)}</td>
      </tr>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>User Wise Sale Report</title>
          <style>
            body {
              font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1F2937;
              padding: 20px;
              font-size: 11px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 18px;
              color: #1E3A8A;
              margin: 0 0 5px 0;
            }
            .header p {
              margin: 0;
              color: #4B5563;
              font-size: 12px;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              font-size: 11px;
              color: #4B5563;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #D1D5DB;
              padding: 6px 8px;
              text-align: left;
            }
            th {
              background-color: #F3F4F6;
              color: #374151;
              font-weight: 600;
              font-size: 10px;
              text-transform: uppercase;
            }
            tr:nth-child(even) {
              background-color: #F9FAFB;
            }
            .totals-row {
              background-color: #EFF6FF !important;
            }
            .totals-row td {
              border-top: 2px solid #3B82F6;
              border-bottom: 2px solid #3B82F6;
            }
            @media print {
              body {
                padding: 0;
              }
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hi-Tech Dairy Shop</h1>
            <p>User Wise Sale Report</p>
          </div>
          <div class="meta-info">
            <div><strong>Period:</strong> ${fromDate} to ${toDate}</div>
            <div><strong>User Filter:</strong> ${selectedUser === 'all' ? 'All Users' : selectedUser}</div>
            <div><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">Sr</th>
                <th>User Name</th>
                <th>Bill No / Date</th>
                <th>Customer Name</th>
                <th style="text-align: center;">Payment Mode</th>
                <th style="text-align: right;">Total Amt</th>
                <th style="text-align: right;">Disc</th>
                <th style="text-align: right;">Taxable Amt</th>
                <th style="text-align: right;">CGST</th>
                <th style="text-align: right;">SGST</th>
                <th style="text-align: right;">IGST</th>
                <th style="text-align: right;">After Tax</th>
                <th style="text-align: right;">Chargeable</th>
                <th style="text-align: right;">Round Off</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${totalsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
