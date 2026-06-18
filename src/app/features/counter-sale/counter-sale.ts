import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { LucideAngularModule, Package, ReceiptText, User, Search, X, Plus, Calendar, ArrowUp, CheckCircle, List } from 'lucide-angular';
import { ProductList } from './components/product-list/product-list';
import { Cart } from './components/cart/cart';
import { BillSummary } from './components/bill-summary/bill-summary';
import { Payment } from './components/payment/payment';
import { CustomerDrawer } from './components/customer-drawer/customer-drawer';
import { CounterSaleService } from '../../core/services/counter-sale.service';
import { NotificationService } from '../../core/services/notification.service';
import { DbService } from '../../core/services/db.service';
import { Subject, Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';

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
    Payment,
    CustomerDrawer
  ],
  templateUrl: './counter-sale.html',
  styleUrl: './counter-sale.scss',
})
export class CounterSale implements OnInit, OnDestroy {
  private counterSaleService = inject(CounterSaleService);
  private notificationService = inject(NotificationService);
  private dbService = inject(DbService);

  isCustomerDrawerOpen = signal<boolean>(false);
  selectedCustomer = this.counterSaleService.selectedCustomer;

  @ViewChild('searchInput', { static: false }) searchInput?: ElementRef<HTMLInputElement>;

  currentTime = signal(new Date());
  private timer: any;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Expose icons to the template
  readonly Package = Package;
  readonly ReceiptText = ReceiptText;
  readonly User = User;
  readonly SearchIcon = Search; // renamed to avoid conflict
  readonly X = X;
  readonly Plus = Plus;
  readonly Calendar = Calendar;
  readonly ArrowUp = ArrowUp;
  readonly CheckCircle = CheckCircle;
  readonly ListIcon = List;

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    this.searchSubscription = this.searchSubject.pipe(
      debounce(() => timer(this.searchType() === 'product' ? 800 : 800))
    ).subscribe(value => {
      if (this.searchType() === 'customer' && value.trim().length > 0) {
        this.onSearchEnter(false); // pass false to avoid spamming snackbars while typing
      }
    });
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  bills = signal<BillTab[]>([
    { id: 1, name: 'Bill 1', active: true }
  ]);

  searchType = this.counterSaleService.searchType;
  searchQuery = this.counterSaleService.searchQuery;
  nextBillId = 2;

  setSearchType(type: 'product' | 'bill' | 'customer') {
    this.searchType.set(type);
    this.counterSaleService.updateSearchQuery('');
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }
    this.searchSubject.next('');
  }

  openCustomerDrawer() {
    this.isCustomerDrawerOpen.set(true);
  }

  closeCustomerDrawer() {
    this.isCustomerDrawerOpen.set(false);
  }

  clearSelectedCustomer() {
    this.counterSaleService.selectedCustomer.set(null);
    this.searchSubject.next('');
  }

  openAddBalance() {
    // TODO: open add-balance dialog for selectedCustomer
    console.log('Add balance for:', this.selectedCustomer());
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.counterSaleService.updateSearchQuery(value); // Update instantly so input text doesn't reset
    this.searchSubject.next(value); // Trigger debounced search
  }

  async onSearchEnter(showSnackbar: boolean = true) {
    if (this.searchType() === 'customer') {
      const query = this.searchQuery().toLowerCase().trim();
      if (!query) return;

      const customers = await this.dbService.customerList.toArray();
      const found = customers.find(c => {
        const name = (c.customerName || c.name || '').toLowerCase();
        const phone = (c.mobileNo || c.phone || '').toLowerCase();
        return name.includes(query) || phone.includes(query);
      });

      if (found) {
        this.counterSaleService.selectedCustomer.set(found);
        this.counterSaleService.updateSearchQuery('');
      } else if (showSnackbar) {
        this.notificationService.showError('Customer not found matching "' + query + '"');
      }
    }
  }

  clearSearch(inputEl: HTMLInputElement) {
    this.counterSaleService.updateSearchQuery('');
    inputEl.value = '';
    this.searchSubject.next('');
  }

  addBill() {
    if (this.bills().length >= 5) {
      return;
    }

    const currentBills = this.bills().map(b => ({ ...b, active: false }));
    const newId = currentBills.length + 1;

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
    let updatedBills = currentBills.filter(b => b.id !== id);

    // If we closed the active bill, make the last one active
    if (billToRemove?.active) {
      updatedBills[updatedBills.length - 1].active = true;
    }

    // Automatically renumber them without gaps
    updatedBills = updatedBills.map((b, index) => {
      const newId = index + 1;
      return {
        ...b,
        id: newId,
        name: `Bill ${newId}`
      };
    });

    this.bills.set(updatedBills);
  }
}
