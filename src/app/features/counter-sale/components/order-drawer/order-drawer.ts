import {
  Component,
  Input,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  Search,
  X,
  ShoppingBag,
  ClipboardList,
  Calendar,
  DollarSign,
  Loader,
  CheckCircle,
  Eye,
  Truck,
} from 'lucide-angular';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CounterInvoiceService } from '../../../../core/services/counter-invoice.service';
import { ConfigService } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-order-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatExpansionModule, MatTooltipModule, EmptyState],
  templateUrl: './order-drawer.html',
  styleUrl: './order-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDrawer implements OnInit, OnDestroy {
  private counterInvoiceService = inject(CounterInvoiceService);
  private configService = inject(ConfigService);
  private notificationService = inject(NotificationService);
  private counterSaleService = inject(CounterSaleService);

  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.loadOrders(this.orderSearchQuery(), this.selectedStatus());
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;

  readonly close = output<void>();

  allOrders = signal<any[]>([]);
  orderSearchQuery = signal<string>('');
  selectedStatus = signal<'Upcoming' | 'delivered'>('Upcoming');
  isLoading = signal<boolean>(false);
  deliveringOrderId = signal<number | null>(null);

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
  readonly CheckCircleIcon = CheckCircle;
  readonly EyeIcon = Eye;
  readonly TruckIcon = Truck;

  filteredOrders = computed(() => {
    const query = this.orderSearchQuery().toLowerCase().trim();
    const list = this.allOrders();
    if (!query) return list;
    return list.filter((order) => {
      const orderNo = String(this.getOrderNo(order)).toLowerCase();
      const customerName = String(this.getCustomerName(order)).toLowerCase();
      const phone = String(this.getMobileNo(order)).toLowerCase();
      return orderNo.includes(query) || customerName.includes(query) || phone.includes(query);
    });
  });

  ngOnInit() {
    const debounceMs = this.configService.getConfig()?.orderSearchDebounceTime ?? 300;
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(debounceMs))
      .subscribe((value) => {
        this.orderSearchQuery.set(value);
        this.loadOrders(value, this.selectedStatus()); // Trigger server-side API search
      });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadOrders(query: string = '', status?: 'Upcoming' | 'delivered') {
    const activeStatus = status || this.selectedStatus();
    this.isLoading.set(true);
    this.counterInvoiceService.getOrderList(query, activeStatus).subscribe({
      next: (res) => {
        const list = res?.data || res || [];
        this.allOrders.set(Array.isArray(list) ? list : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.isLoading.set(false);
      },
    });
  }

  setStatusFilter(status: 'Upcoming' | 'delivered') {
    if (this.selectedStatus() === status && !this.orderSearchQuery()) return;
    this.selectedStatus.set(status);
    this.orderSearchQuery.set('');
    this.loadOrders('', status);
  }

  onOrderSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  clearSearch() {
    if (!this.orderSearchQuery()) return;
    this.orderSearchQuery.set('');
    this.loadOrders('', this.selectedStatus());
  }

  closeDrawer() {
    this.orderSearchQuery.set('');
    this.close.emit();
  }

  // Resilient field extractors
  getOrderNo(order: any): string {
    return order.orderId || order.orderNo || order.orderNumber || order.id || '—';
  }

  getCustomerName(order: any): string {
    return (
      order.customerName ||
      order.partyName ||
      order.name ||
      order.customer?.customerName ||
      order.customer?.name ||
      'Unknown Customer'
    );
  }

  getMobileNo(order: any): string {
    return (
      order.mobileNumber ||
      order.mobileNo ||
      order.phone ||
      order.mobile ||
      order.customer?.mobileNo ||
      ''
    );
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

  getDrawerWidth(): number {
    return this.configService.getConfig()?.orderDrawerWidth ?? 800;
  }

  deliverOrder(order: any, event: Event) {
    event.stopPropagation();
    const orderId = order.orderId || order.id;
    if (!orderId) {
      this.notificationService.showError('Invalid Order ID.');
      return;
    }

    this.deliveringOrderId.set(orderId);
    this.counterInvoiceService.updateOrderStatus(orderId, 'delivered').subscribe({
      next: () => {
        this.notificationService.showSuccess(
          'Order #' + orderId + ' marked as delivered successfully.',
        );
        this.deliveringOrderId.set(null);
        this.loadOrders(this.orderSearchQuery(), this.selectedStatus());
      },
      error: (err) => {
        console.error('Error delivering order:', err);
        this.notificationService.showError('Failed to mark order as delivered.');
        this.deliveringOrderId.set(null);
      },
    });
  }

  selectOrder(order: any, event: Event) {
    event.stopPropagation();
    const orderId = order.orderId || order.id;
    if (!orderId) {
      // Fallback
      this.counterSaleService.loadOrderToCart(order).then(() => {
        this.closeDrawer();
      });
      return;
    }

    this.isLoading.set(true);
    const userDetailsStr = localStorage.getItem('UserDetails');
    let unitId = 0;
    try { if (userDetailsStr) unitId = JSON.parse(userDetailsStr)?.unitid || JSON.parse(userDetailsStr)?.unitId || 0; } catch (e) { }

    this.counterInvoiceService.getOrderById(orderId, unitId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const fullOrder = (res && res.length > 0) ? res[0] : order;
        this.counterSaleService.loadOrderToCart(fullOrder).then(() => {
          this.closeDrawer();
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to get full order details', err);
        // Fallback to basic load
        this.counterSaleService.loadOrderToCart(order).then(() => {
          this.closeDrawer();
        });
      }
    });
  }
}
