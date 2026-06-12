import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private apiService: ApiService) { }

  handshake(publickey: string): Observable<any> {
    return this.apiService.post<any>('api/v1/auth/handshaking', { publicKey: publickey }, undefined, 'main');
  }

  login(credentials: string): Observable<any> {
    return this.apiService.post<any>('api/v1/auth/login', JSON.stringify({ data: credentials }), undefined, 'main').pipe(
      tap(response => {
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
