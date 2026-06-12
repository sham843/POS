import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    /**
     * Resolves the base URL from the configuration based on the requested API.
     * @param apiName - The identifier for the API ('main', 'jaldoot', etc.)
     * @returns The base URL string or an empty string if using a proxy.
     */
    private getBaseUrl(apiName: string = 'main'): string {
        const config = this.configService.getConfig();
        switch (apiName) {
            case 'main':
            default:
                return config?.apiUrl || '';
        }
    }

    /**
     * Constructs a clean, absolute or proxy-relative URL.
     * @param endpoint - The API endpoint
     * @param apiName - The target API service name
     */
    private buildUrl(endpoint: string, apiName: string = 'main'): string {
        const baseUrl = this.getBaseUrl(apiName);

        if (!baseUrl) {
            // When using proxy (empty base URL), ensure the endpoint starts with a slash
            return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        }

        // Prevent double slashes when combining base URL and endpoint
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${cleanBaseUrl}/${cleanEndpoint}`;
    }

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) { }

    /**
     * Generic GET method
     */
    get<T>(endpoint: string, params?: HttpParams, apiName: string = 'main'): Observable<T> {
        return this.http.get<T>(this.buildUrl(endpoint, apiName), { params, withCredentials: true });
    }

    /**
     * Generic POST method
     */
    post<T>(endpoint: string, body: any, headers?: HttpHeaders, apiName: string = 'main'): Observable<T> {
        return this.http.post<T>(this.buildUrl(endpoint, apiName), body, { headers, withCredentials: true });
    }

    /**
     * Generic PUT method
     */
    put<T>(endpoint: string, body: any, apiName: string = 'main'): Observable<T> {
        return this.http.put<T>(this.buildUrl(endpoint, apiName), body, { withCredentials: true });
    }

    /**
     * Generic DELETE method
     */
    delete<T>(endpoint: string, apiName: string = 'main'): Observable<T> {
        return this.http.delete<T>(this.buildUrl(endpoint, apiName), { withCredentials: true });
    }
}
