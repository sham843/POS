import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { HealthService } from './core/services/health.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  public languageService = inject(LanguageService);
  public themeService = inject(ThemeService);
  private healthService = inject(HealthService);

  ngOnInit() {
    this.languageService.initLanguage();
    this.themeService.initTheme();
    
    // Start global health check polling (every 30 seconds) on all pages
    this.healthService.startHealthCheck();
  }
}
