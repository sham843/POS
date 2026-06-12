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
    ) { }

    get<T>(endpoint: string, params?: HttpParams): Observable<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint}`;
        return this.http.get<T>(url, { params });
    }

    post<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<T> {
        console.log(endpoint)
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint}`;
        return this.http.post<T>(url, body, { headers });
    }

    put<T>(endpoint: string, body: any): Observable<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint}`;
        return this.http.put<T>(url, body);
    }

    delete<T>(endpoint: string): Observable<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint}`;
        return this.http.delete<T>(url);
    }
}
