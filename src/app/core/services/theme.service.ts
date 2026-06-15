import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor() { }

  initTheme() {
    const savedTheme = localStorage.getItem('app-theme') || 'system';
    this.setTheme(savedTheme);
  }

  setTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }

  getCurrentTheme(): string {
    return localStorage.getItem('app-theme') || 'system';
  }
}
