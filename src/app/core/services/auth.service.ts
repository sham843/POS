import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private apiService: ApiService) { }

  handshake(publickey: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.apiService.post<any>('api/v1/auth/handshaking', JSON.stringify({ publicKey: publickey }), headers, 'main');
  }

  login(credentials: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.apiService.post<any>('api/v1/auth/login', JSON.stringify({ data: credentials }), headers, 'main').pipe(
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
