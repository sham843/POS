import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, X, CheckCircle, Users, UserCheck } from 'lucide-angular';
import { MatTableModule } from '@angular/material/table';
import { DbService } from '../../../../core/services/db.service';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-customer-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatTableModule],
  templateUrl: './customer-drawer.html',
  styleUrl: './customer-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDrawer implements OnInit, OnDestroy {
  private dbService = inject(DbService);
  private counterSaleService = inject(CounterSaleService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  allCustomers = signal<any[]>([]);
  customerSearchQuery = signal<string>('');
  selectedCustomer = this.counterSaleService.selectedCustomer;

  displayedColumns: string[] = ['name', 'credit', 'balance', 'action'];

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Icons
  readonly SearchIcon = Search;
  readonly XIcon = X;
  readonly CheckCircleIcon = CheckCircle;
  readonly UsersIcon = Users;
  readonly UserCheckIcon = UserCheck;

  filteredCustomers = computed(() => {
    const query = this.customerSearchQuery().toLowerCase().trim();
    const list = this.allCustomers();
    if (!query) return list;
    const result = list.filter(c => {
      const name = (c.customerName || c.name || '').toLowerCase();
      const phone = (c.mobileNo || c.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
    // DOM Limiting: Slice to 100 rows to prevent lag
    return result.slice(0, 100);
  });

  ngOnInit() {
    this.loadCustomers();
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(value => {
      this.customerSearchQuery.set(value);
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  async loadCustomers() {
    try {
      const list = await this.dbService.customerList.toArray();
      this.allCustomers.set(list || []);
    } catch (err) {
      console.error('Error fetching customers from IndexedDB:', err);
    }
  }

  onCustomerSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  clearSearch() {
    this.customerSearchQuery.set('');
    this.searchSubject.next('');
  }

  getAvatarInitial(c: any): string {
    const name = c.customerName || c.name || '?';
    return name[0].toUpperCase();
  }

  selectCustomer(c: any) {
    const current = this.selectedCustomer();
    if (current?.id === c.id) {
      this.counterSaleService.updateActiveBill({ selectedCustomer: null });
    } else {
      this.counterSaleService.updateActiveBill({ selectedCustomer: c });
      this.counterSaleService.searchType.set('customer');
    }
    this.closeDrawer();
  }

  closeDrawer() {
    this.clearSearch();
    this.close.emit();
  }
}
