import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, X, ShoppingBag, ClipboardList, Calendar, DollarSign, Loader } from 'lucide-angular';
import { MatExpansionModule } from '@angular/material/expansion';
import { CounterInvoiceService } from '../../../../core/services/counter-invoice.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-order-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatExpansionModule],
  templateUrl: './order-drawer.html',
  styleUrl: './order-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDrawer implements OnInit, OnDestroy {
  private counterInvoiceService = inject(CounterInvoiceService);

  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.loadOrders();
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;

  @Output() close = new EventEmitter<void>();

  allOrders = signal<any[]>([]);
  orderSearchQuery = signal<string>('');
  isLoading = signal<boolean>(false);

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Icons
  readonly SearchIcon = Search;
  readonly XIcon = X;
  readonly ShoppingBagIcon = ShoppingBag;
  readonly ClipboardListIcon = ClipboardList;
  readonly CalendarIcon = Calendar;
  readonly DollarSignIcon = DollarSign;
  readonly LoaderIcon = Loader;

  filteredOrders = computed(() => {
    const query = this.orderSearchQuery().toLowerCase().trim();
    const list = this.allOrders();
    if (!query) return list;
    return list.filter(order => {
      const orderNo = this.getOrderNo(order).toLowerCase();
      const customerName = this.getCustomerName(order).toLowerCase();
      const phone = this.getMobileNo(order).toLowerCase();
      return orderNo.includes(query) || customerName.includes(query) || phone.includes(query);
    });
  });

  ngOnInit() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(value => {
      this.orderSearchQuery.set(value);
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadOrders() {
    this.isLoading.set(true);
    this.counterInvoiceService.getOrderList().subscribe({
      next: (res) => {
        const list = res?.data || res || [];
        this.allOrders.set(Array.isArray(list) ? list : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.isLoading.set(false);
      }
    });
  }

  onOrderSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  clearSearch() {
    this.orderSearchQuery.set('');
    this.searchSubject.next('');
  }

  closeDrawer() {
    this.clearSearch();
    this.close.emit();
  }

  // Resilient field extractors
  getOrderNo(order: any): string {
    return order.orderId || order.orderNo || order.orderNumber || order.id || '—';
  }

  getCustomerName(order: any): string {
    return order.customerName || order.partyName || order.name || order.customer?.customerName || order.customer?.name || 'Unknown Customer';
  }

  getMobileNo(order: any): string {
    return order.mobileNumber || order.mobileNo || order.phone || order.mobile || order.customer?.mobileNo || '';
  }

  getOrderDate(order: any): any {
    return order.orderDate || order.deliveryDate || order.createdDate || order.date || null;
  }

  getTotalAmount(order: any): number {
    return order.totalAmount || order.total || order.amount || order.grandTotal || 0;
  }

  getBalanceAmount(order: any): number {
    return order.balanceAmount || order.balance || 0;
  }

  getStatus(order: any): string {
    return order.deliveryStatus || order.status || 'Upcoming';
  }

  getAvatarInitial(order: any): string {
    const name = this.getCustomerName(order);
    return name ? name[0].toUpperCase() : '?';
  }
}
