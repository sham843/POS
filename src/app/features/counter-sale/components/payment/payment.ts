import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule, Delete, Banknote, Globe, CreditCard, Eraser } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    MatButtonModule
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment {
  counterSaleService = inject(CounterSaleService);

  // Expose icons to template
  readonly Delete = Delete;
  readonly Banknote = Banknote;
  readonly Globe = Globe;
  readonly CreditCard = CreditCard;
  readonly Eraser = Eraser;

  get mode() {
    return this.counterSaleService.numpadMode;
  }

  get numpadValue() {
    return this.counterSaleService.numpadValue;
  }

  setMode(mode: 'quantity' | 'amount' | 'discount') {
    this.counterSaleService.setNumpadMode(mode);
  }

  handleInput(val: string) {
    this.counterSaleService.handleNumpadInput(val);
  }

  setQuickWeight(val: string) {
    this.counterSaleService.setNumpadValueExplicit(val);
  }
}
