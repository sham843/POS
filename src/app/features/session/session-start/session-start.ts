import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, LogOut, Phone, Wallet, Receipt, Banknote, Calendar, Clock, Wifi, WifiOff } from 'lucide-angular';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterDataService } from '../../../core/services/master-data.service';
import { HealthService } from '../../../core/services/health.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';

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

  userDetails = signal<any>(null);
  currentDate = signal<Date>(new Date());

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
    // Master data is already loaded in ngOnInit
    // Just navigate to next screen
    this.router.navigate(['/counter-sale']);
  }

  onAvatarError(event: any) {
    const name = this.userDetails()?.name || 'User';
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052CC&color=fff&rounded=true&size=90`;
  }

  logout() {
    localStorage.removeItem('UserDetails');
    this.router.navigate(['/login']);
  }
}

