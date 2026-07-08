import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LucideAngularModule, LayoutDashboard, Search, RotateCcw, IndianRupee, Receipt, Banknote, Ticket, CreditCard, Smartphone, Calculator, TrendingUp } from 'lucide-angular';
import { ApiService } from '../../core/services/api.service';
import { NgApexchartsModule } from 'ng-apexcharts';

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
    LucideAngularModule,
    NgApexchartsModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

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

  public last7DaysChartOptions: any;
  public monthlyChartOptions: any;

  ngOnInit() {
    this.initCharts();
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
    this.fetchLast7DaysSale();
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
    this.fetchLast7DaysSale();
  }

  clearFilters() {
    const today = new Date();
    this.fromDateObj.set(today);
    this.toDateObj.set(today);
    this.fetchSummary();
    this.fetchLast7DaysSale();
  }

  fetchLast7DaysSale() {
    const fromDateObj = this.fromDateObj();
    const toDateObj = this.toDateObj();
    
    if (!fromDateObj || !toDateObj) return;

    const fromDateStr = this.formatToIsoString(fromDateObj, false);
    const toDateStr = this.formatToIsoString(toDateObj, true);

    this.apiService.get<any>(`api/v1/dashboard/last-7-days-sale?fromDate=${fromDateStr}&toDate=${toDateStr}`).subscribe({
      next: (res) => {
        let arr: any[] = [];
        if (Array.isArray(res)) {
          arr = res;
        } else if (res && Array.isArray(res.data)) {
          arr = res.data;
        }

        if (arr.length > 0) {
          const categories = arr.map(item => item.date);
          const data = arr.map(item => item.amount);

          this.last7DaysChartOptions = {
            ...this.last7DaysChartOptions,
            series: [{ name: "Sales", data: data }],
            xaxis: {
              ...this.last7DaysChartOptions.xaxis,
              categories: categories
            }
          };
          this.cdr.markForCheck();
        }
      },
      error: (err) => console.error('Error fetching last 7 days sale:', err)
    });
  }

  initCharts() {
    this.last7DaysChartOptions = {
      series: [
        {
          name: "Sales",
          data: [1200, 2100, 800, 3200, 1500, 2800, 3900]
        }
      ],
      chart: {
        height: 350,
        type: "area",
        toolbar: { show: false }
      },
      title: {
        text: "Last 7 Days Sales",
        align: "left",
        style: {
          fontWeight: "600",
          fontSize: "15px",
          color: "#4B5563"
        }
      },
      xaxis: {
        categories: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
      },
      yaxis: {
        labels: {
          formatter: function (value: number) {
            return "₹" + value;
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return "₹" + val;
          }
        }
      },
      colors: ["#0052CC"],
      dataLabels: { 
        enabled: true,
        formatter: function (val: number) {
          return "₹" + val;
        }
      },
      stroke: { curve: "smooth" }
    };

    this.monthlyChartOptions = {
      series: [
        {
          name: "Sales",
          data: [15000, 22000, 18000, 26000, 21000, 32000, 28000, 35000, 30000, 24000, 38000, 42000]
        }
      ],
      chart: {
        height: 350,
        type: "bar",
        toolbar: { show: false }
      },
      title: {
        text: "Monthly Sales",
        align: "left",
        style: {
          fontWeight: "600",
          fontSize: "15px",
          color: "#4B5563"
        }
      },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      },
      yaxis: {
        labels: {
          formatter: function (value: number) {
            return "₹" + value;
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return "₹" + val;
          }
        }
      },
      colors: ["#0052CC"],
      dataLabels: { enabled: false }
    };
  }
}
