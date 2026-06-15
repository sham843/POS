import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,
    TranslatePipe
  ],
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  public themeService = inject(ThemeService);
  public languageService = inject(LanguageService);
  
  currentLangLabel = 'English';
  currentTheme = 'system';

  languages = [
    { code: 'en', label: 'English' },
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिंदी' }
  ];

  themes = [
    { code: 'light', label: 'Light', icon: 'light_mode' },
    { code: 'dark', label: 'Dark', icon: 'dark_mode' },
    { code: 'system', label: 'System', icon: 'settings_brightness' }
  ];

  ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    const savedLangCode = this.languageService.getCurrentLanguage();
    const lang = this.languages.find(l => l.code === savedLangCode);
    this.currentLangLabel = lang ? lang.label : 'English';
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
    this.themeService.setTheme(theme);
  }

  setLanguage(langCode: string, langLabel: string) {
    this.currentLangLabel = langLabel;
    this.languageService.setLanguage(langCode);
  }
}

