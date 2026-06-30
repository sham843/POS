import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject, ElementRef, HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, Droplets, PieChart, Monitor, LineChart, Settings, Sun, LogOut, Calendar, RefreshCw } from 'lucide-angular';
import { HealthService } from '../core/services/health.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { NetworkStatusComponent } from '../shared/components/network-status/network-status';
import { UpdateConfirmModalComponent } from '../shared/components/update-confirm-modal/update-confirm-modal';
import packageInfo from '../../../package.json';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, NetworkStatusComponent, UpdateConfirmModalComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  // Expose icons to the template
  readonly Droplets = Droplets;
  readonly PieChart = PieChart;
  readonly Monitor = Monitor;
  readonly LineChart = LineChart;
  readonly Settings = Settings;
  readonly RefreshCw = RefreshCw;
  readonly Sun = Sun;
  readonly LogOut = LogOut;
  readonly Calendar = Calendar;
  router = inject(Router);
  healthService = inject(HealthService);
  private swUpdate = inject(SwUpdate);
  private elementRef = inject(ElementRef);
  currentTime = signal(new Date());
  showProfileMenu = signal(false);
  userDetails = signal<any>(null);
  appVersion = signal<string>('');
  updateAvailableVersion = signal<string>('');
  updateDownloaded = signal<boolean>(false);
  isCheckingForUpdate = signal<boolean>(false);
  showUpdateConfirmModal = signal<boolean>(false);
  private timerInterval: any;

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
          console.log('Update available:', version);
          this.updateAvailableVersion.set(version);
        });
      }
      if (typeof electronAPI.onUpdateDownloaded === 'function') {
        electronAPI.onUpdateDownloaded((version: string) => {
          console.log('Update downloaded and ready to install:', version);
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

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          if (confirm('New update available! Reload to apply changes?')) {
            window.location.reload();
          }
        });
    }

    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        this.userDetails.set(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse UserDetails', e);
      }
    }

    this.timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  getAvatarInitial(name: string): string {
    if (!name) return 'PV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  toggleProfileMenu() {
    this.showProfileMenu.update(val => !val);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showProfileMenu()) {
      const clickedInside = this.elementRef.nativeElement.querySelector('.profile-menu-container')?.contains(event.target as Node);
      if (!clickedInside) {
        this.showProfileMenu.set(false);
      }
    }
  }

  endSession() {
    this.showProfileMenu.set(false);
    this.router.navigate(['/session-end']);
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
