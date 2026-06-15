import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProductList } from './components/product-list/product-list';
import { Cart } from './components/cart/cart';
import { BillSummary } from './components/bill-summary/bill-summary';
import { Payment } from './components/payment/payment';

interface BillTab {
  id: number;
  name: string;
  active: boolean;
}

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
export class CounterSale {
  bills = signal<BillTab[]>([
    { id: 1, name: 'Bill 1', active: true }
  ]);
  
  searchType = signal<'bill' | 'customer'>('bill');
  nextBillId = 2;

  setSearchType(type: 'bill' | 'customer') {
    this.searchType.set(type);
  }

  addBill() {
    const currentBills = this.bills().map(b => ({ ...b, active: false }));
    const newBill: BillTab = {
      id: this.nextBillId++,
      name: `Bill ${this.nextBillId - 1}`,
      active: true
    };
    this.bills.set([...currentBills, newBill]);
  }

  selectBill(id: number) {
    const updatedBills = this.bills().map(b => ({
      ...b,
      active: b.id === id
    }));
    this.bills.set(updatedBills);
  }

  removeBill(id: number, event: Event) {
    event.stopPropagation();
    
    let currentBills = this.bills();
    if (currentBills.length === 1) {
      // Don't close the last bill, or you can clear it instead.
      return;
    }
    
    const billToRemove = currentBills.find(b => b.id === id);
    const updatedBills = currentBills.filter(b => b.id !== id);
    
    // If we closed the active bill, make the last one active
    if (billToRemove?.active) {
      updatedBills[updatedBills.length - 1].active = true;
    }
    
    this.bills.set(updatedBills);
  }
}
