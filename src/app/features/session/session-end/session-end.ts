import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, Store, ReceiptText, Banknote, ScanBarcode, CreditCard, ArrowLeft, LogOut, Wifi, WifiOff, Calendar, Clock, Receipt, Ticket, Globe, Calculator, Bot, Phone, Printer, Wallet, X, CheckCircle, RefreshCw } from 'lucide-angular';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';
import { HealthService } from '../../../core/services/health.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SessionService } from '../../../core/services/session.service';
import { DbService } from '../../../core/services/db.service';
import { UpdateConfirmModalComponent } from '../../../shared/components/update-confirm-modal/update-confirm-modal';
import packageInfo from '../../../../../package.json';

@Component({
  selector: 'app-session-end',
  imports: [CommonModule, MatCardModule, MatButtonModule, LucideAngularModule, MatDividerModule, NetworkStatusComponent, TranslatePipe, FormsModule, UpdateConfirmModalComponent],
  standalone: true,
  templateUrl: './session-end.html',
  styleUrl: './session-end.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionEnd {
  router = inject(Router);
  public healthService = inject(HealthService);
  apiService = inject(ApiService);
  sessionService = inject(SessionService);
  dbService = inject(DbService);

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
  appVersion = signal<string>('');
  updateAvailableVersion = signal<string>('');
  updateDownloaded = signal<boolean>(false);
  isCheckingForUpdate = signal<boolean>(false);
  showUpdateConfirmModal = signal<boolean>(false);

  // Expose RefreshCw icon
  readonly RefreshCw = RefreshCw;

  sessionData = signal<any>({
    userName: '',
    date: '',
    startTime: '',
    saleOverview: {
      creditSale: 0,
      couponSale: 0,
      onlineSale: 0,
      cashSale: 0,
      totalAmount: 0,
      totalBills: 0
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

  ngOnInit() {
    const electronAPI = (window as any).electron;
    if (electronAPI && typeof electronAPI.getAppVersion === 'function') {
      electronAPI.getAppVersion().then((version: string) => {
        this.appVersion.set(version);
      }).catch((err: any) => {
        console.error('Failed to get app version:', err);
        this.appVersion.set(packageInfo.version);
      });
    } else {
      this.appVersion.set(packageInfo.version);
    }

    if (electronAPI) {
      if (typeof electronAPI.onUpdateAvailable === 'function') {
        electronAPI.onUpdateAvailable((version: string) => {
          this.updateAvailableVersion.set(version);
        });
      }
      if (typeof electronAPI.onUpdateDownloaded === 'function') {
        electronAPI.onUpdateDownloaded((version: string) => {
          this.updateAvailableVersion.set(version);
          this.updateDownloaded.set(true);
        });
      }
      if (typeof electronAPI.onNoUpdate === 'function') {
        electronAPI.onNoUpdate(() => {
          if (this.isCheckingForUpdate()) {
            this.isCheckingForUpdate.set(false);
            alert('Your application is up to date!');
          }
        });
      }
    }

    const userStr = localStorage.getItem('UserDetails');
    let userId = 0;
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        this.userDetails.set(parsed);
        userId = parsed?.id || 0;
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }

    if (userId) {
      this.apiService.get<any>(`api/v1/session/today-summery/${userId}`).subscribe({
        next: (response) => {
          const data = response?.data;
          if (data) {
            this.sessionData.set({
              userName: this.userDetails()?.name || 'User',
              date: data.date || data.Date || new Date().toLocaleDateString(),
              startTime: data.startTime || data.StartTime || '-',
              saleOverview: {
                creditSale: data.creditSale || data.CreditSale || 0,
                couponSale: data.couponSale || data.CouponSale || 0,
                onlineSale: data.onlineSale || data.OnlineSale || 0,
                cashSale: data.cashSale || data.CashSale || 0,
                totalAmount: data.totalAmount || data.TotalAmount || data.totalSale || data.TotalSale || 0,
                totalBills: data.totalBills || data.TotalBills || 0
              },
              online: {
                onlineSale: data.onlineSale || data.OnlineSale || 0,
                customerDepositOnline: data.customerDepositOnline || data.CustomerDepositOnline || 0
              },
              cash: {
                cashSale: data.cashSale || data.CashSale || 0,
                openingBalance: data.openingBalance || data.OpeningBalance || 0,
                couponCustomerAdvReceived: data.couponCustomerAdvReceived || data.couponCustAdvReceived || data.CouponCustomerAdvReceived || 0,
                actualCashReceived: data.actualCashReceived || data.ActualCashReceived || 0
              }
            });

            // Initialize nextShiftOpeningBalance to default expected cash
            const expectedCash = (data.cashSale || 0) + (data.openingBalance || 0) + (data.couponCustomerAdvReceived || 0);
            this.nextShiftOpeningBalance.set(expectedCash);
          }
        },
        error: (err) => {
          console.error('Failed to fetch session summary:', err);
        }
      });
    }

    // Auto-select the 500 denomination input when page loads
    this.setActiveField('denomination', 500);
  }

  goBack() {
    this.router.navigate(['/counter-sale']);
  }

  printSummary() {
    window.print();
  }

  clearAllFields() {
    this.onlineDifference.set(null);
    this.otherCash.set(null);
    this.expense.set(null);
    this.nextShiftOpeningBalance.set(null);
    this.remark.set('');
    this.cashCounts.set({
      500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
    });
    this.setActiveField('denomination', 500);
  }

  // Active Input Field Tracking
  activeField = signal<{ name: 'onlineDifference' | 'otherCash' | 'expense' | 'nextShiftOpeningBalance' | 'denomination', den?: number } | null>(null);

  setActiveField(name: 'onlineDifference' | 'otherCash' | 'expense' | 'nextShiftOpeningBalance' | 'denomination', den?: number) {
    this.activeField.set({ name, den });
  }

  isFieldActive(name: string, den?: number): boolean {
    const active = this.activeField();
    if (!active) return false;
    if (name === 'denomination') {
      return active.name === 'denomination' && active.den === den;
    }
    return active.name === name;
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

  actualCashReceived = computed(() => {
    const cash = this.sessionData()?.cash;
    if (!cash) return 0;
    const cashSale = cash.cashSale || 0;
    const openingBalance = cash.openingBalance || 0;
    const couponAdv = cash.couponCustomerAdvReceived || 0;
    const other = this.otherCash() || 0;
    const exp = this.expense() || 0;
    const nextShift = Number(this.nextShiftOpeningBalance()) || 0;
    return cashSale + openingBalance + couponAdv + other - exp - nextShift;
  });

  cashDifference = computed(() => {
    return this.totalCollection() - this.actualCashReceived();
  });

  updateCashCount(den: number, value: string) {
    const parsed = parseInt(value, 10) || 0;
    this.cashCounts.update(counts => ({ ...counts, [den]: parsed }));
  }

  onKeypadPress(key: number | string) {
    const currentActive = this.activeField();
    if (!currentActive) return;

    let currentValue = '';
    if (currentActive.name === 'denomination') {
      const den = currentActive.den!;
      currentValue = (this.cashCounts()[den] || 0).toString();
    } else {
      const val = (this as any)[currentActive.name]();
      currentValue = val !== null && val !== undefined && val !== 0 ? val.toString() : '';
    }

    if (key === 'C') {
      currentValue = '';
    } else if (key === '⌫') {
      currentValue = currentValue.slice(0, -1);
    } else {
      if (currentValue.length < 10) {
        currentValue = currentValue + key.toString();
      }
    }

    const numericValue = currentValue === '' ? 0 : parseInt(currentValue, 10);

    if (currentActive.name === 'denomination') {
      const den = currentActive.den!;
      this.cashCounts.update(counts => ({ ...counts, [den]: numericValue }));
    } else {
      (this as any)[currentActive.name].set(numericValue === 0 ? null : numericValue);
    }
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
    const user = this.userDetails();
    const localSessionId = this.sessionService.getSessionId();
    const sessionId = localSessionId ? parseInt(localSessionId, 10) : 0;

    const payload = {
      UserId: user?.id || 0,
      SessionId: sessionId,
      ClosingBalance: this.totalCollection(),
      otherCash: this.otherCash() || 0,
      openingBalanceforNextShift: this.nextShiftOpeningBalance() || 0
    };

    this.apiService.post<any>('api/v1/session/end', payload).subscribe({
      next: async () => {
        // Clear IndexedDB
        await this.dbService.clearAllData();

        // Clear all storage
        this.sessionService.clearSessionId();
        localStorage.clear();
        sessionStorage.clear();

        // Navigate to login
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Failed to end session:', err);
        // alert('Failed to end session. Check console for details.');
      }
    });
  }

  onVersionBadgeClick() {
    if (this.updateAvailableVersion()) {
      this.installUpdate();
    } else {
      const electronAPI = (window as any).electron;
      if (electronAPI && typeof electronAPI.checkForUpdate === 'function') {
        this.isCheckingForUpdate.set(true);
        electronAPI.checkForUpdate();
      }
    }
  }

  installUpdate() {
    this.showUpdateConfirmModal.set(true);
  }

  cancelUpdateInstall() {
    this.showUpdateConfirmModal.set(false);
  }

  confirmUpdateInstall() {
    this.showUpdateConfirmModal.set(false);
    const electronAPI = (window as any).electron;
    if (electronAPI && typeof electronAPI.installUpdate === 'function') {
      electronAPI.installUpdate();
    }
  }
}
