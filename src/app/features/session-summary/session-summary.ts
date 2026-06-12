import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MasterDataService } from '../../core/services/master-data.service';

@Component({
  selector: 'app-session-summary',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
})
export class SessionSummary implements OnInit {
  private masterDataService = inject(MasterDataService);
  private router = inject(Router);

  userDetails: any = null;
  currentDate: Date = new Date();

  ngOnInit(): void {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        this.userDetails = JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }
  }

  async startSession() {
    try {
      // The global ngx-spinner will automatically show up because this service calls APIs
      // which trigger the api.interceptor.ts
      await this.masterDataService.loadAndStoreMasterData();
      
      // Navigate to next screen
      this.router.navigate(['/counter-sale']);
    } catch (error) {
      console.error('Failed to start session', error);
      // The api.interceptor will automatically show the error toast
    }
  }
}
