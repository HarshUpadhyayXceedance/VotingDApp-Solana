import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private current: 'dark' | 'light' = 'dark';

  constructor() {
    if (this.isBrowser) {
      // Only access document in browser environment
      this.initializeTheme();
    }
  }

  private initializeTheme() {
    // Check for saved theme preference or default to 'dark'
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    this.current = savedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', this.current);
  }

  toggle() {
    if (!this.isBrowser) return;

    this.current = this.current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.current);
    
    // Save theme preference
    localStorage.setItem('theme', this.current);
  }

  getCurrentTheme(): 'dark' | 'light' {
    return this.current;
  }

  setTheme(theme: 'dark' | 'light') {
    if (!this.isBrowser) return;

    this.current = theme;
    document.documentElement.setAttribute('data-theme', this.current);
    localStorage.setItem('theme', this.current);
  }
}