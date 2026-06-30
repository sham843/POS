import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, LogOut, Phone, Wallet, Receipt, Banknote, Calendar, Clock, Wifi, WifiOff } from 'lucide-angular';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterDataService } from '../../../core/services/master-data.service';
import { HealthService } from '../../../core/services/health.service';
import { ApiService } from '../../../core/services/api.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';
import packageInfo from '../../../../../package.json';

import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-session-start',
  imports: [CommonModule, MatButtonModule, LucideAngularModule, TranslatePipe, NetworkStatusComponent],
  standalone: true,
  templateUrl: './session-start.html',
  styleUrl: './session-start.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionStart {
  private masterDataService = inject(MasterDataService);
  private router = inject(Router);
  public healthService = inject(HealthService);
  private apiService = inject(ApiService);
  private sessionService = inject(SessionService);

  userDetails = signal<any>(null);
  currentDate = signal<Date>(new Date());
  appVersion = signal<string>('');

  // Expose icons to the template
  readonly LogOut = LogOut;
  readonly Phone = Phone;
  readonly Wallet = Wallet;
  readonly Receipt = Receipt;
  readonly Banknote = Banknote;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Wifi = Wifi;
  readonly WifiOff = WifiOff;

  async ngOnInit() {
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

    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        this.userDetails.set(JSON.parse(userStr));
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
    const user = this.userDetails();
    const params = {
      request: {
        userId: user?.id || 0,
        username: user?.name || '',
        openingBalance: user?.openingBalance ? Math.round(Number(user.openingBalance)) : 0
      }
    };

    this.apiService.post<any>('api/v1/session/start', params).subscribe({
      next: (response) => {
        const session = response?.data;
        if (session) {
          this.sessionService.setSessionId(session);
          this.router.navigate(['/counter-sale']);
        } else {
          // alert('Failed to get session ID from server.');
        }
      },
      error: (err) => {
        console.error('Error starting session', err);
        // alert('Error starting session. Check console for details.');
      }
    });
  }

  onAvatarError(event: any) {
    const name = this.userDetails()?.name || 'User';
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052CC&color=fff&rounded=true&size=90`;
  }

  logout() {
    this.sessionService.clearSessionId();
    localStorage.removeItem('UserDetails');
    localStorage.removeItem('tk_9xf1BzX');
    this.router.navigate(['/login']);
  }
}

