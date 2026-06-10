import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('POS');
  public languageService = inject(LanguageService);

  ngOnInit() {
    this.languageService.initLanguage();
  }

  onLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.languageService.setLanguage(target.value);
  }
}
