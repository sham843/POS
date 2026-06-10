import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('POS');
  public languageService = inject(LanguageService);

  currentTheme: 'system' | 'light' | 'dark' = 'system';

  ngOnInit() {
    this.languageService.initLanguage();
    this.applyTheme(this.currentTheme);
  }

  onLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.languageService.setLanguage(target.value);
  }

  setTheme(theme: 'system' | 'light' | 'dark') {
    this.currentTheme = theme;
    this.applyTheme(theme);
  }

  private applyTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
