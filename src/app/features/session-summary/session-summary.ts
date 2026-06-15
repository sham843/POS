import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterDataService } from '../../core/services/master-data.service';

@Component({
  selector: 'app-session-summary',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
})
export class SessionSummary implements OnInit {
  private masterDataService = inject(MasterDataService);
  private router = inject(Router);

  userDetails: any = null;
  currentDate: Date = new Date();

  async ngOnInit() {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        this.userDetails = JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }

    try {
      // Load master data as soon as the page opens
      await this.masterDataService.loadAndStoreMasterData();
    } catch (error) {
      console.error('Failed to load master data on init', error);
    }
  }

  startSession() {
    // Master data is already loaded in ngOnInit
    // Just navigate to next screen
    this.router.navigate(['/counter-sale']);
  }

  onAvatarError(event: any) {
    const name = this.userDetails?.name || 'User';
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=116256&color=fff&rounded=true&size=90`;
  }

  logout() {
    localStorage.removeItem('UserDetails');
    this.router.navigate(['/login']);
  }
}
