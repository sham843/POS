import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);

  constructor() { 
    this.translate.addLangs(['en', 'mr', 'hi']);
    this.translate.setFallbackLang('en');
  }

  initLanguage() {
    const savedLang = localStorage.getItem('app-lang') || 'en';
    this.translate.use(savedLang);
  }

  setLanguage(langCode: string) {
    localStorage.setItem('app-lang', langCode);
    this.translate.use(langCode);
  }

  getCurrentLanguage(): string {
    return localStorage.getItem('app-lang') || 'en';
  }
}
