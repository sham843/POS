import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-session-end',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule],
  standalone: true,
  templateUrl: './session-end.html',
  styleUrl: './session-end.scss',
})
export class SessionEnd {
  router = inject(Router);

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
