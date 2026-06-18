import { Injectable, inject, signal, NgZone } from '@angular/core';
import { ApiService } from './api.service';
import { interval, Subscription, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private apiService = inject(ApiService);
  private ngZone = inject(NgZone);
  private healthSubscription?: Subscription;

  /** true = internet + server both reachable, false = either is down */
  isOnline = signal<boolean>(navigator.onLine);

  /** Detailed status: 'online' | 'no-internet' | 'server-down' */
  status = signal<'online' | 'no-internet' | 'server-down'>(
    navigator.onLine ? 'online' : 'no-internet'
  );

  /** Start polling + browser online/offline listeners */
  startHealthCheck() {
    // Listen for browser online/offline events
    window.addEventListener('online', this.onBrowserOnline);
    window.addEventListener('offline', this.onBrowserOffline);

    // If already online, check server health immediately
    if (navigator.onLine) {
      this.checkHealth();
    }

    // Poll server health every 30 seconds
    this.ngZone.runOutsideAngular(() => {
      this.healthSubscription = interval(30000).subscribe(() => {
        this.ngZone.run(() => {
          if (navigator.onLine) {
            this.checkHealth();
          } else {
            this.isOnline.set(false);
            this.status.set('no-internet');
          }
        });
      });
    });
  }

  /** Stop all polling and listeners */
  stopHealthCheck() {
    if (this.healthSubscription) {
      this.healthSubscription.unsubscribe();
      this.healthSubscription = undefined;
    }
    window.removeEventListener('online', this.onBrowserOnline);
    window.removeEventListener('offline', this.onBrowserOffline);
  }

  /** Browser detected internet is back */
  private onBrowserOnline = () => {
    this.ngZone.run(() => {
      // Internet is back, but verify server is also reachable
      this.checkHealth();
    });
  };

  /** Browser detected internet is gone */
  private onBrowserOffline = () => {
    this.ngZone.run(() => {
      this.isOnline.set(false);
      this.status.set('no-internet');
    });
  };

  /** Single health check call to the server */
  private checkHealth() {
    this.apiService.get<any>('api/v1/auth/health').pipe(
      catchError(() => {
        this.isOnline.set(false);
        this.status.set('server-down');
        return of(null);
      })
    ).subscribe(response => {
      if (response !== null) {
        this.isOnline.set(true);
        this.status.set('online');
      }
    });
  }
}
