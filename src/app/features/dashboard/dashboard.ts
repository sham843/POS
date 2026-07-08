import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LucideAngularModule, LayoutDashboard, Search, RotateCcw, IndianRupee, Receipt, Banknote, Ticket, CreditCard, Smartphone, Calculator, TrendingUp } from 'lucide-angular';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    LucideAngularModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  private apiService = inject(ApiService);

  LayoutDashboardIcon = LayoutDashboard;
  SearchIcon = Search;
  ClearIcon = RotateCcw;

  IndianRupeeIcon = IndianRupee;
  ReceiptIcon = Receipt;
  BanknoteIcon = Banknote;
  TicketIcon = Ticket;
  CreditCardIcon = CreditCard;
  SmartphoneIcon = Smartphone;
  CalculatorIcon = Calculator;
  TrendingUpIcon = TrendingUp;

  maxDate = new Date();

  fromDateObj = signal<Date | null>(new Date());
  toDateObj = signal<Date | null>(new Date());

  totalSale = signal<number>(0);
  totalBills = signal<number>(0);
  cashSale = signal<number>(0);
  couponSale = signal<number>(0);
  creditSale = signal<number>(0);
  onlineSale = signal<number>(0);
  averageSale = signal<number>(0);
  
  userId = signal<number>(0);

  ngOnInit() {
    const today = new Date();
    this.fromDateObj.set(today);
    this.toDateObj.set(today);
    
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userId.set(user.id || user.userId || 620); // Fallback to 620 if not found
      } catch (e) {
        console.error('Failed to parse user from local storage');
        this.userId.set(620);
      }
    } else {
      this.userId.set(620);
    }
    
    this.fetchSummary();
  }

  formatToIsoString(date: Date, isEndDate: boolean): string {
    const d = new Date(date);
    if (isEndDate) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  }

  fetchSummary() {
    const fromDateObj = this.fromDateObj();
    const toDateObj = this.toDateObj();
    
    if (!fromDateObj || !toDateObj) return;

    const fromDateStr = this.formatToIsoString(fromDateObj, false);
    const toDateStr = this.formatToIsoString(toDateObj, true);
    const uId = this.userId();

    this.apiService.get<any>(`api/v1/dashboard/totalsummery?fromDate=${fromDateStr}&toDate=${toDateStr}&userId=${uId}`).subscribe({
      next: (res) => {
        if (res && res.data) {
          const d = res.data;
          this.totalSale.set(d.totalSale || 0);
          this.totalBills.set(d.totalBill || 0);
          this.cashSale.set(d.cash || 0);
          this.couponSale.set(d.coupon || 0);
          this.creditSale.set(d.credit || 0);
          this.onlineSale.set(d.online || 0);
          this.averageSale.set(d.averageSale || 0);
        }
      },
      error: (err) => console.error('Error fetching dashboard summary:', err)
    });
  }

  onFromDateChange(date: Date | null) {
    this.fromDateObj.set(date);
  }

  onToDateChange(date: Date | null) {
    this.toDateObj.set(date);
  }

  searchReport() {
    this.fetchSummary();
  }

  clearFilters() {
    this.fromDateObj.set(new Date());
    this.toDateObj.set(new Date());
    this.fetchSummary();
  }
}
