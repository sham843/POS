import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any = null;

  constructor(private http: HttpClient) { }

  public async loadConfig(): Promise<void> {
    try {
      const timestamp = new Date().getTime();
      this.config = await firstValueFrom(this.http.get(`assets/config/app-config.json?v=${timestamp}`));
      // console.log('App Config Loaded Successfully:', this.config);
    } catch (error) {
      // console.error('Failed to load application configuration', error);
      this.config = {
        formFieldAppearance: 'outline',
        apiUrl: 'https://demoposapi.hitechdairy.in'
      };
    }
  }

  public getConfig(): any {
    return this.config;
  }
}
