import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private sessionId = signal<string | null>(null);

  setSessionId(id: string | number) {
    this.sessionId.set(id ? id.toString() : null);
    if (id) {
      localStorage.setItem('sessionId', id.toString());
    } else {
      localStorage.removeItem('sessionId');
    }
  }

  getSessionId(): string | null {
    if (!this.sessionId()) {
      const stored = localStorage.getItem('sessionId');
      if (stored) {
        this.sessionId.set(stored);
      }
    }
    return this.sessionId();
  }

  clearSessionId() {
    this.sessionId.set(null);
    localStorage.removeItem('sessionId');
  }
}
