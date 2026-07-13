import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, LogOut, Phone, Wallet, Receipt, Banknote, Calendar, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-angular';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterDataService } from '../../../core/services/master-data.service';
import { HealthService } from '../../../core/services/health.service';
import { ApiService } from '../../../core/services/api.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';
import { UpdateConfirmModalComponent } from '../../../shared/components/update-confirm-modal/update-confirm-modal';
import packageInfo from '../../../../../package.json';

import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-session-start',
  imports: [CommonModule, MatButtonModule, LucideAngularModule, TranslatePipe, NetworkStatusComponent, UpdateConfirmModalComponent],
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
  updateAvailableVersion = signal<string>('');
  updateDownloaded = signal<boolean>(false);
  isCheckingForUpdate = signal<boolean>(false);
  isMasterDataLoading = signal<boolean>(true);
  isStartingSession = signal<boolean>(false);
  showUpdateConfirmModal = signal<boolean>(false);

  // Expose icons to the template
  readonly LogOut = LogOut;
  readonly Phone = Phone;
  readonly RefreshCw = RefreshCw;
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
    if (userStr) {
      try {
        this.userDetails.set(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }

    try {
      this.isMasterDataLoading.set(true);
      // Load master data as soon as the page opens
      await this.masterDataService.loadAndStoreMasterData();
    } catch (error) {
      console.error('Failed to load master data on init', error);
    } finally {
      this.isMasterDataLoading.set(false);
    }
  }

  startSession() {
    if (this.isMasterDataLoading() || this.isStartingSession()) return;
    this.isStartingSession.set(true);

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
          this.isStartingSession.set(false);
        }
      },
      error: (err) => {
        console.error('Error starting session', err);
        // alert('Error starting session. Check console for details.');
        this.isStartingSession.set(false);
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
    localStorage.removeItem('lastSyncedTime');
    localStorage.removeItem('app-theme');
    this.router.navigate(['/login']);
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

