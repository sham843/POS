import {
  Component,
  Input,
  inject,
  signal,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Plus, ReceiptText, ClipboardList } from 'lucide-angular';
import { DbService } from '../../../../core/services/db.service';
import { CounterInvoiceService } from '../../../../core/services/counter-invoice.service';
import { ConfigService } from '../../../../core/services/config.service';
import { AddBalanceComponent } from './components/add-balance/add-balance';
import { LedgerHistoryComponent } from './components/ledger-history/ledger-history';

@Component({
  selector: 'app-customer-ledger',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AddBalanceComponent, LedgerHistoryComponent],
  templateUrl: './customer-ledger.html',
  styleUrl: './customer-ledger.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerLedger implements OnInit, OnChanges {
  private dbService = inject(DbService);
  private counterInvoiceService = inject(CounterInvoiceService);
  private configService = inject(ConfigService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Input() isOpen = false;
  readonly customer = input<any>(null);

  readonly close = output<void>();
  readonly balanceAdded = output<void>();

  activeTab = signal<'add' | 'history'>('add');

  // Shared Dropdown Signals
  partiesList = signal<any[]>([]);
  bankAccountsList = signal<any[]>([]);
  cashLedgersList = signal<any[]>([]);
  combinedBankCashList = signal<any[]>([]);
  paymentModesList = signal<any[]>([]);

  // Icons
  readonly XIcon = X;
  readonly PlusIcon = Plus;
  readonly ReceiptTextIcon = ReceiptText;
  readonly ClipboardListIcon = ClipboardList;

  ngOnInit() {
    // Initialization handled in ngOnChanges when drawer opens
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['isOpen']?.currentValue === true ||
      (this.isOpen && changes['customer']?.currentValue)
    ) {
      this.loadDropdownData();
    }
  }

  switchTab(tab: 'add' | 'history') {
    this.activeTab.set(tab);
  }

  closeDrawer() {
    this.close.emit();
  }

  onBalanceAdded() {
    this.balanceAdded.emit();
  }

  getDrawerWidth(): number {
    return (
      this.configService.getConfig()?.customerLedgerWidth ??
      this.configService.getConfig()?.orderDrawerWidth ??
      650
    );
  }

  async loadDropdownData() {
    try {
      const parties = await this.dbService.customerList.toArray();
      const mappedParties = (parties || [])
        .map((p) => {
          const cName = p.customerName || p.name || `Customer #${p.id}`;
          return {
            ...p,
            id: Number(p.id ?? 0),
            customerName: cName,
            displayName: cName,
          };
        })
        .filter((p) => p.id > 0);

      mappedParties.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

      const customer = this.customer();
      const rawCustId = customer?.id ?? customer?.customerId ?? customer?.partyId;
      if (rawCustId) {
        const custId = Number(rawCustId);
        const customerValue = this.customer();
        const cName =
          customerValue.customerName ||
          customerValue.name ||
          customerValue.displayName ||
          `Customer #${custId}`;
        const existing = mappedParties.find((p) => Number(p.id) === custId);
        if (!existing) {
          mappedParties.unshift({
            ...this.customer(),
            id: custId,
            customerName: cName,
            displayName: cName,
          });
        } else {
          existing.customerName = cName;
          existing.displayName = cName;
        }
      }

      this.partiesList.set(mappedParties);

      const banks = await this.dbService.bankAccounts.toArray();
      const mappedBanks = (banks || [])
        .map((b) => {
          const name =
            b.customerName ||
            b.bankName ||
            b.ledgerName ||
            b.accountName ||
            b.name ||
            `Bank #${b.id}`;
          return {
            ...b,
            id: Number(b.id ?? 0),
            customerName: name,
            bankName: name,
            displayName: name,
          };
        })
        .filter((b) => b.id > 0);
      this.bankAccountsList.set(mappedBanks);

      const cash = await this.dbService.cashLedger.toArray();
      const mappedCash = (cash || [])
        .map((c) => {
          const name = c.customerName || c.ledgerName || c.name || `Cash #${c.id}`;
          return {
            ...c,
            id: Number(c.id ?? 0),
            customerName: name,
            ledgerName: name,
            displayName: name,
          };
        })
        .filter((c) => c.id > 0);
      this.cashLedgersList.set(mappedCash);

      // Combine cash and bank accounts for filter and deduplicate by ID
      const combinedMap = new Map<number, any>();
      mappedCash.forEach((c) => {
        if (c.id > 0) combinedMap.set(c.id, { id: c.id, name: c.displayName, type: 'Cash' });
      });
      mappedBanks.forEach((b) => {
        if (b.id > 0 && !combinedMap.has(b.id)) {
          combinedMap.set(b.id, { id: b.id, name: b.displayName, type: 'Bank' });
        }
      });
      this.combinedBankCashList.set(Array.from(combinedMap.values()));

      this.counterInvoiceService
        .getPaymentList()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: any) => {
            const list = res?.data || res || [];
            if (Array.isArray(list)) {
              this.paymentModesList.set(list);
            }
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            console.error('Error fetching payment modes:', err);
          },
        });

      this.cdr.markForCheck();
    } catch (e) {
      console.error('Error loading dropdown lists from IndexedDB', e);
    }
  }
}
