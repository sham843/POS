import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, X, CheckCircle, Users, UserCheck } from 'lucide-angular';
import { DbService } from '../../../../core/services/db.service';
import { CounterSaleService } from '../../../../core/services/counter-sale.service';

@Component({
  selector: 'app-customer-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './customer-drawer.html',
  styleUrl: './customer-drawer.scss'
})
export class CustomerDrawer implements OnInit {
  private dbService = inject(DbService);
  private counterSaleService = inject(CounterSaleService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  allCustomers = signal<any[]>([]);
  customerSearchQuery = signal<string>('');
  selectedCustomer = this.counterSaleService.selectedCustomer;

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
    return list.filter(c => {
      const name = (c.customerName || c.name || '').toLowerCase();
      const phone = (c.mobileNo || c.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  });

  ngOnInit() {
    this.loadCustomers();
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
    this.customerSearchQuery.set(input.value);
  }

  clearSearch() {
    this.customerSearchQuery.set('');
  }

  selectCustomer(c: any) {
    const current = this.selectedCustomer();
    if (current?.id === c.id) {
      this.counterSaleService.selectedCustomer.set(null);
    } else {
      this.counterSaleService.selectedCustomer.set(c);
    }
    this.closeDrawer();
  }

  closeDrawer() {
    this.clearSearch();
    this.close.emit();
  }
}
