import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANGUAGE_KEY = 'app_lang';
  private readonly DEFAULT_LANG = 'en';

  public supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'mr', name: 'मराठी (Marathi)' }
  ];

  constructor(private translate: TranslateService) {}

  initLanguage() {
    this.translate.addLangs(this.supportedLanguages.map(l => l.code));
    this.translate.setFallbackLang(this.DEFAULT_LANG);

    const savedLang = localStorage.getItem(this.LANGUAGE_KEY) || this.DEFAULT_LANG;
    this.setLanguage(savedLang);
  }

  setLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem(this.LANGUAGE_KEY, lang);
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang() || this.DEFAULT_LANG;
  }
}
