import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calculator, X, Wallet, Globe, Ticket, Banknote, Receipt, Bot, Calendar, Clock, Phone, CheckCircle } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-cash-report-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './cash-report-drawer.component.html',
  styleUrl: './cash-report-drawer.component.scss'
})
export class CashReportDrawerComponent {
  @Input() isOpen = false;
  @Input() sessionData: any;
  @Input() userDetails: any;
  
  @Output() closeEvent = new EventEmitter<void>();
  @Output() saveEvent = new EventEmitter<any>();

  // Icons
  readonly Calculator = Calculator;
  readonly X = X;
  readonly Wallet = Wallet;
  readonly Globe = Globe;
  readonly Ticket = Ticket;
  readonly Banknote = Banknote;
  readonly Receipt = Receipt;
  readonly Bot = Bot;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Phone = Phone;
  readonly CheckCircle = CheckCircle;

  // Keypad
  keypadNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'];
  
  // Inputs
  onlineDifference = signal<number | null>(null);
  otherCash = signal<number | null>(null);
  expense = signal<number | null>(null);
  nextShiftOpeningBalance = signal<number | null>(null);
  remark = signal('');

  // Denominations
  denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  cashCounts = signal<Record<number, number>>({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });

  totalCollection = computed(() => {
    const counts = this.cashCounts();
    return this.denominations.reduce((sum, den) => sum + (den * (counts[den] || 0)), 0);
  });

  cashDifference = computed(() => {
    const actualReceived = this.sessionData?.cash?.actualCashReceived || 0;
    return this.totalCollection() - actualReceived;
  });

  updateCashCount(den: number, value: string) {
    const parsed = parseInt(value, 10) || 0;
    this.cashCounts.update(counts => ({ ...counts, [den]: parsed }));
  }

  onKeypadPress(key: number | string) {
    console.log('Keypad pressed:', key);
  }

  getAvatarInitial(name: string): string {
    if (!name) return 'PV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  closeDrawer() {
    this.closeEvent.emit();
  }

  saveReport() {
    this.saveEvent.emit({
      counts: this.cashCounts(),
      total: this.totalCollection(),
      remark: this.remark(),
      otherCash: this.otherCash(),
      expense: this.expense(),
      nextShiftOpeningBalance: this.nextShiftOpeningBalance(),
      onlineDifference: this.onlineDifference()
    });
  }
}
