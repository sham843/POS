import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private get baseUrl(): string {
        return this.configService.getConfig()?.apiUrl || '';
    }

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) {}

    get<T>(endpoint: string, params?: HttpParams): Observable<T> {
        return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { params, withCredentials: true });
    }

    post<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<T> {
        return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body, { headers, withCredentials: true });
    }

    put<T>(endpoint: string, body: any): Observable<T> {
        return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body, { withCredentials: true });
    }

    delete<T>(endpoint: string): Observable<T> {
        return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, { withCredentials: true });
    }

    handshaking(publicKey?: string): Observable<any> {
        const payload = publicKey ? { publicKey } : {};
        return this.post<any>('api/v1/auth/handshaking', payload);
    }
}
