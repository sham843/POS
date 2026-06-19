import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, Droplets, PieChart, Monitor, LineChart, Settings, Sun, LogOut } from 'lucide-angular';
import { HealthService } from '../core/services/health.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
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
  router = inject(Router);
  healthService = inject(HealthService);
  private swUpdate = inject(SwUpdate);
  currentTime = signal(new Date());
  showProfileMenu = signal(false);
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

    this.timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    // Start health check polling (every 30 seconds)
    this.healthService.startHealthCheck();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    // Stop health check polling
    this.healthService.stopHealthCheck();
  }

  toggleProfileMenu() {
    this.showProfileMenu.update(val => !val);
  }

  endSession() {
    this.showProfileMenu.set(false);
    this.router.navigate(['/session-end']);
  }
}
