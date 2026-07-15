import { Component, inject, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthService } from '../../../core/services/health.service';

@Component({
  selector: 'app-network-status',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="status-indicator"
      [ngClass]="cssClass()"
      [class.offline]="!healthService.isOnline()"
    >
      <span class="status-dot"></span>
      @switch (healthService.status()) {
        @case ('online') {
          <span class="status-text">Online</span>
        }
        @case ('no-internet') {
          <span class="status-text">Offline</span>
        }
        @case ('server-down') {
          <span class="status-text">Server Down</span>
        }
      }
    </div>
  `,
})
export class NetworkStatusComponent {
  readonly cssClass = input<string>('');
  public healthService = inject(HealthService);
}
