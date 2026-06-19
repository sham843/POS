import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  public readonly electron: any;

  constructor() {
    if (this.isElectronApp()) {
      this.electron = (window as any).electron;
    } else {
      console.warn('Running in Browser Mode - Electron API not available');
    }
  }

  isElectron(): boolean {
    return !!this.electron;
  }

  private isElectronApp(): boolean {
    return typeof window !== 'undefined' && !!(window && (window as any).electron);
  }

  sendPrintData(data: any): void {
    if (this.electron) {
      this.electron.sendPrintData(data);
    } else {
      console.warn('Browser Mode: sendPrintData skipped');
    }
  }
}
