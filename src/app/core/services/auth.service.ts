import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private apiService: ApiService) { }

  handshake(publickey: string): Observable<any> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'X-Skip-Loader': 'true'
    });
    return this.apiService.post<any>('api/v1/auth/handshaking', JSON.stringify({ publicKey: publickey }), headers, 'main');
  }

  login(credentials: string): Observable<any> {
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/json',
      'X-Custom-Error': 'Invalid username or password.'
    });
    return this.apiService.post<any>('api/v1/auth/login', JSON.stringify({ data: credentials }), headers, 'main');
  }

  logout(): void {
    localStorage.removeItem('tk_9xf1BzX');
    localStorage.removeItem('UserDetails');
  }

  getToken(): string | null {
    return localStorage.getItem('tk_9xf1BzX');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
