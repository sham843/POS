import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProductList } from './components/product-list/product-list';
import { Cart } from './components/cart/cart';
import { BillSummary } from './components/bill-summary/bill-summary';
import { Payment } from './components/payment/payment';

@Component({
  selector: 'app-counter-sale',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ProductList,
    Cart,
    BillSummary,
    Payment
  ],
  templateUrl: './counter-sale.html',
  styleUrl: './counter-sale.scss',
})
export class CounterSale {}
