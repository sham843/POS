import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, Store, ReceiptText, Banknote, ScanBarcode, CreditCard, ArrowLeft, LogOut } from 'lucide-angular';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-session-end',
  imports: [CommonModule, MatCardModule, MatButtonModule, LucideAngularModule, MatDividerModule],
  standalone: true,
  templateUrl: './session-end.html',
  styleUrl: './session-end.scss',
})
export class SessionEnd {
  router = inject(Router);

  // Expose icons to the template
  readonly Store = Store;
  readonly ReceiptText = ReceiptText;
  readonly Banknote = Banknote;
  readonly ScanBarcode = ScanBarcode;
  readonly CreditCard = CreditCard;
  readonly ArrowLeft = ArrowLeft;
  readonly LogOut = LogOut;

  // Mock data for the session summary
  sessionData = {
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
  };

  goBack() {
    this.router.navigate(['/counter-sale']);
  }

  confirmEndSession() {
    // Perform logout logic and navigate to login
    this.router.navigate(['/login']);
  }
}
