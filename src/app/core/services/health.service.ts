import { Injectable, inject, signal, NgZone } from '@angular/core';
import { ApiService } from './api.service';
import { Subscription, catchError, of, timeout, switchMap, timer } from 'rxjs';

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
    // Prevent duplicate polling if already started
    if (this.healthSubscription) return;

    // Listen for browser online/offline events
    window.addEventListener('online', this.onBrowserOnline);
    window.addEventListener('offline', this.onBrowserOffline);

    // Use switchMap so each new 30s tick cancels any pending HTTP request
    this.ngZone.runOutsideAngular(() => {
      this.healthSubscription = timer(0, 30000).pipe(
        switchMap(() => {
          if (!navigator.onLine) {
            this.ngZone.run(() => {
              this.isOnline.set(false);
              this.status.set('no-internet');
            });
            return of(null);
          }
          // 10 second timeout — if server doesn't respond in 10s, treat as down
          return this.apiService.get<any>('api/v1/auth/health').pipe(
            timeout(10000),
            catchError(() => {
              this.ngZone.run(() => {
                this.isOnline.set(false);
                this.status.set('server-down');
              });
              return of(null);
            })
          );
        })
      ).subscribe(response => {
        if (response !== null) {
          this.ngZone.run(() => {
            this.isOnline.set(true);
            this.status.set('online');
          });
        }
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
      // Internet is back — do a quick server check
      this.apiService.get<any>('api/v1/auth/health').pipe(
        timeout(10000),
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
    });
  };

  /** Browser detected internet is gone */
  private onBrowserOffline = () => {
    this.ngZone.run(() => {
      this.isOnline.set(false);
      this.status.set('no-internet');
    });
  };
}
