import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { LucideAngularModule, Package, ReceiptText, User, Search, X, Plus, Calendar, ArrowUp } from 'lucide-angular';
import { ProductList } from './components/product-list/product-list';
import { Cart } from './components/cart/cart';
import { BillSummary } from './components/bill-summary/bill-summary';
import { Payment } from './components/payment/payment';
import { CounterSaleService } from '../../core/services/counter-sale.service';

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
    LucideAngularModule,
    ProductList,
    Cart,
    BillSummary,
    Payment
  ],
  templateUrl: './counter-sale.html',
  styleUrl: './counter-sale.scss',
})
export class CounterSale implements OnInit, OnDestroy {
  private counterSaleService = inject(CounterSaleService);

  currentTime = signal(new Date());
  private timer: any;

  // Expose icons to the template
  readonly Package = Package;
  readonly ReceiptText = ReceiptText;
  readonly User = User;
  readonly SearchIcon = Search; // renamed to avoid conflict
  readonly X = X;
  readonly Plus = Plus;
  readonly Calendar = Calendar;
  readonly ArrowUp = ArrowUp;

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  bills = signal<BillTab[]>([
    { id: 1, name: 'Bill 1', active: true }
  ]);
  
  searchType = this.counterSaleService.searchType;
  nextBillId = 2;

  setSearchType(type: 'product' | 'bill' | 'customer') {
    this.searchType.set(type);
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.counterSaleService.updateSearchQuery(value);
  }

  addBill() {
    if (this.bills().length >= 5) {
      return;
    }
    
    // Find the smallest available ID
    const existingIds = this.bills().map(b => b.id);
    let newId = 1;
    while (existingIds.includes(newId)) {
      newId++;
    }

    const currentBills = this.bills().map(b => ({ ...b, active: false }));
    const newBill: BillTab = {
      id: newId,
      name: `Bill ${newId}`,
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
