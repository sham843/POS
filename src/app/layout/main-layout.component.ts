import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, Droplets, PieChart, Monitor, LineChart, Settings, Sun, LogOut, Calendar } from 'lucide-angular';
import { HealthService } from '../core/services/health.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { NetworkStatusComponent } from '../shared/components/network-status/network-status';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, NetworkStatusComponent],
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
  readonly Sun = Sun;
  readonly LogOut = LogOut;
  readonly Calendar = Calendar;
  router = inject(Router);
  healthService = inject(HealthService);
  private swUpdate = inject(SwUpdate);
  currentTime = signal(new Date());
  showProfileMenu = signal(false);
  userDetails = signal<any>(null);
  private timerInterval: any;

  ngOnInit() {
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

  endSession() {
    this.showProfileMenu.set(false);
    this.router.navigate(['/session-end']);
  }
}
