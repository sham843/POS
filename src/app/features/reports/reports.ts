import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LucideAngularModule, User, Box, FileText, Users, Scale, ShieldCheck, History, Wallet, Receipt } from 'lucide-angular';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Reports implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private sub?: Subscription;

  // Expose icons
  readonly User = User;
  readonly Box = Box;
  readonly FileText = FileText;
  readonly Users = Users;
  readonly Scale = Scale;
  readonly ShieldCheck = ShieldCheck;
  readonly History = History;
  readonly Wallet = Wallet;
  readonly Receipt = Receipt;

  activeReport = signal<string>('user');
  currentTime = signal(new Date());

  reportTitle = computed(() => {
    switch (this.activeReport()) {
      case 'user': return 'User Report';
      case 'product': return 'Product Report';
      case 'bill': return 'Bill Report';
      case 'customer': return 'Customer Report';
      case 'party': return 'All Party Balance';
      case 'gst': return 'GST Report';
      case 'payment': return 'Customer Payment History';
      case 'cash': return 'Cash Report';
      case 'sales': return 'Sales Invoice Report';
      default: return 'User Report';
    }
  });

  reportIcon = computed(() => {
    switch (this.activeReport()) {
      case 'user': return User;
      case 'product': return Box;
      case 'bill': return FileText;
      case 'customer': return Users;
      case 'party': return Scale;
      case 'gst': return ShieldCheck;
      case 'payment': return History;
      case 'cash': return Wallet;
      case 'sales': return Receipt;
      default: return User;
    }
  });

  // Mock Datasets
  usersData = [
    { id: 1, name: 'Pravin Varpe', role: 'Admin', status: 'Active', sales: 12450, bills: 45 },
    { id: 2, name: 'Rahul Shinde', role: 'Cashier', status: 'Active', sales: 8400, bills: 32 },
    { id: 3, name: 'Amit Patil', role: 'Cashier', status: 'Inactive', sales: 0, bills: 0 }
  ];

  productsData = [
    { id: 1, name: 'Cow Milk (1L)', category: 'Milk', price: 60, stock: 120, status: 'In Stock' },
    { id: 2, name: 'Buffalo Milk (1L)', category: 'Milk', price: 80, stock: 80, status: 'In Stock' },
    { id: 3, name: 'Fresh Paneer (200g)', category: 'Cheese', price: 90, stock: 15, status: 'Low Stock' },
    { id: 4, name: 'Amul Butter (100g)', category: 'Butter', price: 55, stock: 0, status: 'Out of Stock' },
    { id: 5, name: 'Shrikhand (500g)', category: 'Sweets', price: 120, stock: 45, status: 'In Stock' }
  ];

  billsData = [
    { id: 'BILL-2026-001', date: '02 Jul 2026', customer: 'Suresh Kumar', amount: 320, method: 'Cash', status: 'Paid' },
    { id: 'BILL-2026-002', date: '02 Jul 2026', customer: 'Ramesh Dev', amount: 150, method: 'UPI', status: 'Paid' },
    { id: 'BILL-2026-003', date: '02 Jul 2026', customer: 'Kiran Mane', amount: 620, method: 'Credit', status: 'Pending' },
    { id: 'BILL-2026-004', date: '02 Jul 2026', customer: 'Prasad Joshi', amount: 80, method: 'Cash', status: 'Paid' }
  ];

  customersData = [
    { id: 1, name: 'Suresh Kumar', phone: '9822334455', tier: 'Gold', visits: 48, totalSpent: 12400 },
    { id: 2, name: 'Ramesh Dev', phone: '9766554433', tier: 'Silver', visits: 24, totalSpent: 5200 },
    { id: 3, name: 'Kiran Mane', phone: '9544332211', tier: 'Bronze', visits: 12, totalSpent: 2100 },
    { id: 4, name: 'Prasad Joshi', phone: '9011223344', tier: 'Silver', visits: 18, totalSpent: 3800 }
  ];

  partyBalanceData = [
    { id: 1, name: 'Ganga Dairy Farm (Vendor)', phone: '8888111222', type: 'Credit', balance: 14500, lastTx: '01 Jul 2026' },
    { id: 2, name: 'Krishna Cattle Feed (Vendor)', phone: '7777222333', type: 'Credit', balance: 8200, lastTx: '28 Jun 2026' },
    { id: 3, name: 'Hotel Radhika (Customer)', phone: '9888444555', type: 'Debit', balance: 6400, lastTx: '02 Jul 2026' },
    { id: 4, name: 'Sai Sweets (Customer)', phone: '9111333444', type: 'Debit', balance: 3200, lastTx: '30 Jun 2026' }
  ];

  gstData = [
    { month: 'Jul 2026 (MTD)', taxable: 24500, cgst: 2205, sgst: 2205, total: 4410 },
    { month: 'Jun 2026', taxable: 382000, cgst: 34380, sgst: 34380, total: 68760 },
    { month: 'May 2026', taxable: 345000, cgst: 31050, sgst: 31050, total: 62100 }
  ];

  paymentHistoryData = [
    { id: 'TXN-9842', date: '02 Jul 2026', customer: 'Hotel Radhika', amount: 4500, method: 'UPI', type: 'Received' },
    { id: 'TXN-9841', date: '02 Jul 2026', customer: 'Ganga Dairy Farm', amount: 8000, method: 'Bank Transfer', type: 'Paid' },
    { id: 'TXN-9840', date: '01 Jul 2026', customer: 'Sai Sweets', amount: 2000, method: 'Cash', type: 'Received' }
  ];

  cashReportData = [
    { date: '02 Jul 2026', opening: 1000, sales: 12450, other: 90, expense: 20, nextShift: 1000, closing: 13520 },
    { date: '01 Jul 2026', opening: 1000, sales: 14200, other: 0, expense: 150, nextShift: 1000, closing: 14050 },
    { date: '30 Jun 2026', opening: 1000, sales: 11800, other: 50, expense: 80, nextShift: 1000, closing: 12770 }
  ];

  salesInvoiceData = [
    { invoice: 'INV-26-401', date: '02 Jul 2026', party: 'Hotel Radhika', gross: 3200, gst: 576, net: 3776 },
    { invoice: 'INV-26-402', date: '02 Jul 2026', party: 'Suresh Kumar', gross: 320, gst: 0, net: 320 },
    { invoice: 'INV-26-403', date: '02 Jul 2026', party: 'Sai Sweets', gross: 1200, gst: 216, net: 1416 }
  ];

  ngOnInit() {
    this.sub = this.route.queryParams.subscribe(params => {
      const type = params['type'];
      if (type) {
        this.activeReport.set(type);
      } else {
        this.activeReport.set('user');
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
