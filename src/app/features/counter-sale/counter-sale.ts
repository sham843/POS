import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule, Package, ReceiptText, User, Search, X, Plus, Calendar, ArrowUp, CheckCircle, List, ShoppingBag } from 'lucide-angular';
import { ProductList } from './components/product-list/product-list';
import { Cart } from './components/cart/cart';
import { BillSummary } from './components/bill-summary/bill-summary';
import { Payment } from './components/payment/payment';
import { CustomerDrawer } from './components/customer-drawer/customer-drawer';
import { OrderDrawer } from './components/order-drawer/order-drawer';
import { CounterSaleService } from '../../core/services/counter-sale.service';
import { NotificationService } from '../../core/services/notification.service';
import { DbService } from '../../core/services/db.service';
import { Subject, Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';



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
    CustomerDrawer,
    OrderDrawer,
    MatTooltipModule
  ],
  templateUrl: './counter-sale.html',
  styleUrl: './counter-sale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterSale implements OnInit, OnDestroy {
  private counterSaleService = inject(CounterSaleService);
  private notificationService = inject(NotificationService);
  private dbService = inject(DbService);

  isCustomerDrawerOpen = signal<boolean>(false);
  isOrderDrawerOpen = signal<boolean>(false);
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
  readonly ShoppingBag = ShoppingBag;

  sessionBillStats = this.counterSaleService.sessionBillStats;

  ngOnInit() {
    this.counterSaleService.resetState();
    this.counterSaleService.fetchSessionBillStats();

    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    this.searchSubscription = this.searchSubject.pipe(
      debounce(() => timer(800))
    ).subscribe(value => {
      if (this.searchType() === 'customer' && value.trim().length > 0) {
        this.onSearchEnter(true); // show snackbar after debounce if not found
      } else if (this.searchType() === 'bill') {
        if (value.trim().length > 0) {
          this.onSearchEnter(false); // fetch bill on debounce silently without error snackbar
        } else {
          this.counterSaleService.clearCart();
        }
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

  bills = this.counterSaleService.bills;
  activeBillId = this.counterSaleService.activeBillId;

  searchType = this.counterSaleService.searchType;
  searchQuery = this.counterSaleService.searchQuery;
  invoiceSummary = this.counterSaleService.invoiceHeader;

  setSearchType(type: 'product' | 'bill' | 'customer') {
    this.searchType.set(type);
    this.counterSaleService.updateSearchQuery('');
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }
    this.searchSubject.next('');
    this.counterSaleService.clearCart();
  }

  openCustomerDrawer() {
    this.isCustomerDrawerOpen.set(true);
  }

  closeCustomerDrawer() {
    this.isCustomerDrawerOpen.set(false);
  }

  openOrderDrawer() {
    this.isOrderDrawerOpen.set(true);
  }

  closeOrderDrawer() {
    this.isOrderDrawerOpen.set(false);
  }

  clearSelectedCustomer() {
    this.counterSaleService.updateActiveBill({ selectedCustomer: null });
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
        this.counterSaleService.updateActiveBill({ selectedCustomer: found });
        this.counterSaleService.updateSearchQuery('');
      } else if (showSnackbar) {
        this.notificationService.showError('Customer not found matching "' + query + '"');
      }
    } else if (this.searchType() === 'bill') {
      const query = this.searchQuery().trim();
      if (!query) return;

      const cleanBillNo = query.split('/')[0];
      this.counterSaleService.loadInvoiceByBillNo(cleanBillNo);
    }
  }

  clearSearch(inputEl: HTMLInputElement) {
    this.counterSaleService.updateSearchQuery('');
    inputEl.value = '';
    this.searchSubject.next('');
    if (this.searchType() === 'bill') {
      this.counterSaleService.clearCart();
    }
  }

  addBill() {
    this.counterSaleService.addBill();
  }

  selectBill(id: number) {
    this.counterSaleService.selectBill(id);
  }

  removeBill(id: number, event: Event) {
    event.stopPropagation();
    this.counterSaleService.removeBill(id);
  }
}
