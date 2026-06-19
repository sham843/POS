import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, Store, ReceiptText, Banknote, ScanBarcode, CreditCard, ArrowLeft, LogOut, Wifi, WifiOff, Calendar, Clock, Receipt, Ticket, Globe, Calculator, Bot, Phone, Printer, Wallet, X, CheckCircle } from 'lucide-angular';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';
import { HealthService } from '../../../core/services/health.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-session-end',
  imports: [CommonModule, MatCardModule, MatButtonModule, LucideAngularModule, MatDividerModule, NetworkStatusComponent, TranslatePipe, FormsModule],
  standalone: true,
  templateUrl: './session-end.html',
  styleUrl: './session-end.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionEnd {
  router = inject(Router);
  public healthService = inject(HealthService);

  // Expose icons to the template
  readonly Store = Store;
  readonly ReceiptText = ReceiptText;
  readonly Banknote = Banknote;
  readonly ScanBarcode = ScanBarcode;
  readonly CreditCard = CreditCard;
  readonly ArrowLeft = ArrowLeft;
  readonly LogOut = LogOut;
  readonly Wifi = Wifi;
  readonly WifiOff = WifiOff;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Receipt = Receipt;
  readonly Ticket = Ticket;
  readonly Globe = Globe;
  readonly Calculator = Calculator;
  readonly Bot = Bot;
  readonly Phone = Phone;
  readonly Printer = Printer;
  readonly Wallet = Wallet;
  readonly X = X;
  readonly CheckCircle = CheckCircle;

  userDetails = signal<any>(null);

  ngOnInit() {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        this.userDetails.set(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }
  }

  // Mock data for the session summary
  sessionData = signal({
    userName: 'Prashant Varma',
    date: '19-06-2026',
    startTime: '11:43 AM',
    saleOverview: {
      creditSale: 0,
      couponSale: 0,
      onlineSale: 0,
      cashSale: 135,
      totalSale: 135,
      totalBills: 1
    },
    online: {
      onlineSale: 0,
      customerDepositOnline: 0
    },
    cash: {
      cashSale: 0,
      openingBalance: 0,
      couponCustomerAdvReceived: 0,
      actualCashReceived: 0
    }
  });

  goBack() {
    this.router.navigate(['/counter-sale']);
  }

  printSummary() {
    window.print();
  }

  // Additional Input Fields
  onlineDifference = signal<number | null>(null);
  otherCash = signal<number | null>(null);
  expense = signal<number | null>(null);
  nextShiftOpeningBalance = signal<number | null>(null);

  // Keypad
  keypadNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'];

  // Remark
  remark = signal('');

  // Denominations
  denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  cashCounts = signal<Record<number, number>>({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });

  totalCollection = computed(() => {
    const counts = this.cashCounts();
    return this.denominations.reduce((sum, den) => sum + (den * (counts[den] || 0)), 0);
  });

  cashDifference = computed(() => {
    const actualReceived = this.sessionData()?.cash?.actualCashReceived || 0;
    return this.totalCollection() - actualReceived;
  });

  updateCashCount(den: number, value: string) {
    const parsed = parseInt(value, 10) || 0;
    this.cashCounts.update(counts => ({ ...counts, [den]: parsed }));
  }

  onKeypadPress(key: number | string) {
    console.log('Keypad pressed:', key);
  }

  getAvatarInitial(name: string): string {
    if (!name) return 'PV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  confirmEndSession() {
    console.log('Saving cash report...', {
      counts: this.cashCounts(),
      total: this.totalCollection(),
      remark: this.remark(),
      otherCash: this.otherCash(),
      expense: this.expense(),
      nextShiftOpeningBalance: this.nextShiftOpeningBalance(),
      onlineDifference: this.onlineDifference()
    });
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    // Navigate to login
    this.router.navigate(['/login']);
  }
}
