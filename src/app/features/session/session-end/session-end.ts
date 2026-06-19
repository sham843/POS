import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, Store, ReceiptText, Banknote, ScanBarcode, CreditCard, ArrowLeft, LogOut, Wifi, WifiOff, Calendar, Clock, Receipt, Ticket, Globe, Calculator, Bot, Phone } from 'lucide-angular';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';
import { HealthService } from '../../../core/services/health.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';

@Component({
  selector: 'app-session-end',
  imports: [CommonModule, MatCardModule, MatButtonModule, LucideAngularModule, MatDividerModule, NetworkStatusComponent, TranslatePipe],
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

  onAvatarError(event: any) {
    const name = this.userDetails()?.name || 'User';
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052CC&color=fff&rounded=true&size=90`;
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

  confirmEndSession() {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Navigate to login
    this.router.navigate(['/login']);
  }
}
