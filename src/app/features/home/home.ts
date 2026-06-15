import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule
  ],
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  public themeService = inject(ThemeService);
  
  currentLang = 'English';
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
    const savedLang = localStorage.getItem('app-lang') || 'English';
    this.currentLang = savedLang;
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
    this.themeService.setTheme(theme);
  }

  setLanguage(langLabel: string) {
    this.currentLang = langLabel;
    localStorage.setItem('app-lang', langLabel);
    // In the future, integrate with ngx-translate or Angular i18n here
  }
}

