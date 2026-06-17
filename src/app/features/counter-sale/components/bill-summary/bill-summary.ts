import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';

@Component({
  selector: 'app-bill-summary',
  standalone: true,
  imports: [CommonModule, MatListModule],
  templateUrl: './bill-summary.html',
  styleUrl: './bill-summary.scss',
})
export class BillSummary {
  counterSaleService = inject(CounterSaleService);

  subTotal = this.counterSaleService.subTotal;
  totalDiscount = this.counterSaleService.totalDiscount;
  taxableAmount = this.counterSaleService.taxableAmount;
  totalGst = this.counterSaleService.totalGst;
  billAmount = this.counterSaleService.billAmount;
  roundOff = this.counterSaleService.roundOff;
  totalPayable = this.counterSaleService.totalPayable;
}
