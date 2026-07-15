import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, Store, Globe, Sun, Moon, SunMoon } from 'lucide-angular';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-home',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    LucideAngularModule,
    MatMenuModule,
    RouterModule,
    TranslatePipe,
  ],
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  public themeService = inject(ThemeService);
  public languageService = inject(LanguageService);

  currentLangLabel = 'English';
  currentTheme = 'system';

  languages = [
    { code: 'en', label: 'English' },
    { code: 'mr', label: 'मराठी' },
    { code: 'hi', label: 'हिंदी' },
  ];

  // Expose icons
  readonly Store = Store;
  readonly Globe = Globe;
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly SunMoon = SunMoon;

  themes = [
    { code: 'light', label: 'Light', icon: Sun },
    { code: 'dark', label: 'Dark', icon: Moon },
    { code: 'system', label: 'System', icon: SunMoon },
  ];

  ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    const savedLangCode = this.languageService.getCurrentLanguage();
    const lang = this.languages.find((l) => l.code === savedLangCode);
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
