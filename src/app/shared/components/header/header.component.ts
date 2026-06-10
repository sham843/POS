import { Component, inject, OnInit, signal } from '@angular/core';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  protected readonly title = signal('POS');
  public languageService = inject(LanguageService);

  currentTheme: 'system' | 'light' | 'dark' = 'system';

  ngOnInit() {
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
