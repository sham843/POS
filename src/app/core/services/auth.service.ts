import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private apiService: ApiService) { }

  handshake(): Observable<any> {
    return this.apiService.post<any>('api/v1/auth/handshaking', {});
  }

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.apiService.post<any>('api/v1/auth/login', credentials).pipe(
      tap(response => {
        // If the API returns a token, store it
        if (response && response.token) {
          localStorage.setItem('auth_token', response.token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
