import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    private getBaseUrl(apiName: string = 'main'): string {
        const config = this.configService.getConfig();
        switch (apiName) {
            case 'main':
            default:
                return config?.apiUrl || '';
        }
    }

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) { }

    get<T>(endpoint: string, params?: HttpParams, apiName: string = 'main'): Observable<T> {
        return this.http.get<T>(`${this.getBaseUrl(apiName)}${this.getBaseUrl(apiName) ? '/' : ''}${endpoint}`, { params, withCredentials: true });
    }

    post<T>(endpoint: string, body: any, headers?: HttpHeaders, apiName: string = 'main'): Observable<T> {
        return this.http.post<T>(`${this.getBaseUrl(apiName)}${this.getBaseUrl(apiName) ? '/' : ''}${endpoint}`, body, { headers, withCredentials: true });
    }

    put<T>(endpoint: string, body: any, apiName: string = 'main'): Observable<T> {
        return this.http.put<T>(`${this.getBaseUrl(apiName)}${this.getBaseUrl(apiName) ? '/' : ''}${endpoint}`, body, { withCredentials: true });
    }

    delete<T>(endpoint: string, apiName: string = 'main'): Observable<T> {
        return this.http.delete<T>(`${this.getBaseUrl(apiName)}${this.getBaseUrl(apiName) ? '/' : ''}${endpoint}`, { withCredentials: true });
    }
}
