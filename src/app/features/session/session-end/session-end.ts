import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, Store, ReceiptText, Banknote, ScanBarcode, CreditCard, ArrowLeft, LogOut, Wifi, WifiOff } from 'lucide-angular';
import { MatDividerModule } from '@angular/material/divider';
import { HealthService } from '../../../core/services/health.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';

@Component({
  selector: 'app-session-end',
  imports: [CommonModule, MatCardModule, MatButtonModule, LucideAngularModule, MatDividerModule, NetworkStatusComponent],
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

  // Mock data for the session summary
  sessionData = signal({
    userName: 'Prashant Varma',
    startTime: new Date(new Date().setHours(new Date().getHours() - 8)), // 8 hours ago
    endTime: new Date(),
    totalBills: 18,
    totalSales: 3920.00,
    payments: {
      cash: 1200.00,
      upi: 2500.00,
      card: 220.00
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
