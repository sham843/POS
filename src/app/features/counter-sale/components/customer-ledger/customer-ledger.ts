import { Component, Input, Output, EventEmitter, inject, signal, effect, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, Plus, DollarSign, ReceiptText, ClipboardList, Loader } from 'lucide-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../../core/adapters/custom-date-adapter';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DbService } from '../../../../core/services/db.service';
import { CounterInvoiceService } from '../../../../core/services/counter-invoice.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfigService } from '../../../../core/services/config.service';
import { SessionService } from '../../../../core/services/session.service';

@Component({
  selector: 'app-customer-ledger',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './customer-ledger.html',
  styleUrl: './customer-ledger.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerLedger implements OnInit {
  private dbService = inject(DbService);
  private counterInvoiceService = inject(CounterInvoiceService);
  private notificationService = inject(NotificationService);
  private configService = inject(ConfigService);
  private sessionService = inject(SessionService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.loadDropdownData();
  }

  @Input() isOpen = false;
  @Input() customer: any = null;

  compareFn(a: any, b: any): boolean {
    if (a === null || a === undefined || b === null || b === undefined) return a === b;
    return String(a) === String(b);
  }

  trackById(index: number, item: any): any {
    return item?.id ?? item?.customerId ?? item?.partyId ?? index;
  }
  @Output() close = new EventEmitter<void>();
  @Output() balanceAdded = new EventEmitter<void>();

  activeTab = signal<'add' | 'history'>('add');
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // History Signals
  ledgerHistory = signal<any[]>([]);
  filteredLedgerHistory = signal<any[]>([]);

  // Dropdown Lists
  partiesList = signal<any[]>([]);
  bankAccountsList = signal<any[]>([]);
  cashLedgersList = signal<any[]>([]);
  combinedBankCashList = signal<any[]>([]);
  paymentModesList = signal<any[]>([]);

  ledgerForm: FormGroup;
  filterForm: FormGroup;

  displayedColumns: string[] = ['sr', 'date', 'billNo', 'credit', 'debit'];

  // Icons
  readonly XIcon = X;
  readonly PlusIcon = Plus;
  readonly DollarSignIcon = DollarSign;
  readonly ReceiptTextIcon = ReceiptText;
  readonly ClipboardListIcon = ClipboardList;
  readonly LoaderIcon = Loader;

  maxDate: Date = new Date();

  constructor() {
    this.ledgerForm = this.fb.group({
      ledger1: [null, Validators.required],
      paymentMode: ['cash', Validators.required],
      ledger2: [null, Validators.required],
      ledgerAmount: [null, [Validators.required, Validators.min(0.01)]],
      transactionDate: [new Date(), Validators.required],
      chequeDate: [new Date(), Validators.required],
      voucherSubType: ['Sale'],
      transactionNo: [''],
      remarks: ['']
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.filterForm = this.fb.group({
      partyId: [null, Validators.required],
      bankLedgerId: [null, Validators.required],
      fromDate: [thirtyDaysAgo, Validators.required],
      toDate: [new Date(), Validators.required]
    });

    // Subscriptions for Reactive Form Changes
    this.ledgerForm.get('transactionDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.ledgerForm.get('chequeDate')?.value) {
          this.ledgerForm.patchValue({ chequeDate: null });
        }
      });

    this.ledgerForm.get('ledger1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val) {
          this.filterForm.patchValue({ partyId: val }, { emitEvent: false });
        }
      });

    this.filterForm.get('partyId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val) {
          this.ledgerForm.patchValue({ ledger1: val }, { emitEvent: false });
          this.loadLedgerHistory(val);
        }
      });

    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyFilters();
      });

    this.ledgerForm.get('paymentMode')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateBankCashLedgerDefault();
      });

    effect(() => {
      if (this.isOpen) {
        const today = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        this.ledgerForm.patchValue({
          paymentMode: 'cash',
          ledgerAmount: null,
          transactionDate: today,
          chequeDate: today,
          voucherSubType: 'Sale',
          transactionNo: '',
          remarks: ''
        }, { emitEvent: false });

        this.filterForm.patchValue({
          fromDate: start,
          toDate: today
        }, { emitEvent: false });

        this.loadDropdownData().then(() => {
          const rawCustId = this.customer?.id ?? this.customer?.customerId ?? this.customer?.partyId;
          const parties = this.partiesList();
          let custId = rawCustId ? Number(rawCustId) : 0;

          if ((!custId || !parties.some(p => Number(p.id) === custId)) && parties.length > 0) {
            custId = Number(parties[0].id);
          }

          if (custId > 0) {
            this.ledgerForm.patchValue({ ledger1: custId });
            this.filterForm.patchValue({ partyId: custId }, { emitEvent: false });
          }
          this.cdr.markForCheck();
        });
      }
    });
  }

  switchTab(tab: 'add' | 'history') {
    this.activeTab.set(tab);
    if (tab === 'history') {
      this.loadLedgerHistory();
    }
  }

  closeDrawer() {
    this.close.emit();
  }

  getDrawerWidth(): number {
    return this.configService.getConfig()?.customerLedgerWidth ?? this.configService.getConfig()?.orderDrawerWidth ?? 650;
  }

  async loadDropdownData() {
    try {
      const parties = await this.dbService.customerList.toArray();
      const mappedParties = (parties || []).map(p => ({
        ...p,
        id: Number(p.id ?? p.customerId ?? p.partyId ?? 0),
        displayName: p.customerName || p.name || `Customer #${p.id}`
      })).filter(p => p.id > 0);

      mappedParties.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

      const rawCustId = this.customer?.id ?? this.customer?.customerId ?? this.customer?.partyId;
      if (rawCustId) {
        const custId = Number(rawCustId);
        if (!mappedParties.some(p => Number(p.id) === custId)) {
          mappedParties.unshift({
            ...this.customer,
            id: custId,
            displayName: this.customer.customerName || this.customer.name || `Customer #${custId}`
          });
        }
      }

      this.partiesList.set(mappedParties);

      const banks = await this.dbService.bankAccounts.toArray();
      const mappedBanks = (banks || []).map(b => {
        const name = b.customerName || b.bankName || b.ledgerName || b.accountName || b.name || `Bank #${b.id}`;
        return {
          ...b,
          id: Number(b.id ?? b.bankAccountId ?? 0),
          customerName: name,
          bankName: name,
          displayName: name
        };
      }).filter(b => b.id > 0);
      this.bankAccountsList.set(mappedBanks);

      const cash = await this.dbService.cashLedger.toArray();
      const mappedCash = (cash || []).map(c => {
        const name = c.customerName || c.ledgerName || c.name || `Cash #${c.id}`;
        return {
          ...c,
          id: Number(c.id ?? c.cashLedgerId ?? 0),
          customerName: name,
          ledgerName: name,
          displayName: name
        };
      }).filter(c => c.id > 0);
      this.cashLedgersList.set(mappedCash);

      // Combine cash and bank accounts for filter
      const combined = [
        ...mappedCash.map(c => ({ id: c.id, name: c.displayName, type: 'Cash' })),
        ...mappedBanks.map(b => ({ id: b.id, name: b.displayName, type: 'Bank' }))
      ];
      this.combinedBankCashList.set(combined);

      this.updateBankCashLedgerDefault();

      if (combined.length > 0 && !this.filterForm.get('bankLedgerId')?.value) {
        this.filterForm.patchValue({ bankLedgerId: combined[0].id }, { emitEvent: false });
      }

      this.counterInvoiceService.getPaymentList()
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
          }
        });

      this.cdr.markForCheck();
    } catch (e) {
      console.error('Error loading dropdown lists from IndexedDB', e);
    }
  }

  setPaymentMode(mode: 'cash' | 'cheque' | 'neft' | 'upi') {
    this.ledgerForm.patchValue({ paymentMode: mode });
  }

  updateBankCashLedgerDefault() {
    const paymentMode = this.ledgerForm.get('paymentMode')?.value;
    if (paymentMode === 'cash') {
      const list = this.cashLedgersList();
      if (list.length > 0) {
        this.ledgerForm.patchValue({ ledger2: list[0].id });
      } else {
        this.ledgerForm.patchValue({ ledger2: null });
      }
    } else {
      // For bank / online payment modes (cheque, neft, upi), let the user select manually
      this.ledgerForm.patchValue({ ledger2: null });
    }
  }

  async loadLedgerHistory(selectedPartyId?: number) {
    const partyId = selectedPartyId || this.filterForm?.get('partyId')?.value || this.ledgerForm.get('ledger1')?.value || this.customer?.id;
    if (!partyId) return;
    this.isLoading.set(true);

    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }
    const orgId = userDetails?.organizationId || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;

    this.counterInvoiceService.getCustomerLedger(partyId, orgId, unitId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const list = res?.data || res || [];
          this.ledgerHistory.set(Array.isArray(list) ? list : []);
          this.applyFilters();
          this.isLoading.set(false);
        },
        error: (err: any) => {
          console.error('Error fetching customer ledger:', err);
          this.ledgerHistory.set([]);
          this.applyFilters();
          this.isLoading.set(false);
        }
      });
  }

  applyFilters() {
    const raw = this.ledgerHistory();
    const filters = this.filterForm.value;

    let filtered = [...raw];

    // 1. Filter by Bank Ledger
    if (filters.bankLedgerId) {
      const bankId = Number(filters.bankLedgerId);
      filtered = filtered.filter(row =>
        Number(row.bankCashLedger) === bankId ||
        Number(row.ledger2) === bankId
      );
    }

    // 2. Filter by From Date
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(row => {
        const date = new Date(row.transactionDate || row.showDate);
        return date >= fromDate;
      });
    }

    // 3. Filter by To Date
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(row => {
        const date = new Date(row.transactionDate || row.showDate);
        return date <= toDate;
      });
    }

    this.filteredLedgerHistory.set(filtered);
  }

  async submitBalance() {
    if (this.ledgerForm.invalid) {
      this.notificationService.showError('Please check all required fields.');
      return;
    }

    const formValues = this.ledgerForm.value;
    const amt = formValues.ledgerAmount;
    const partyId = formValues.ledger1;

    this.isSaving.set(true);

    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }

    const orgId = userDetails?.organizationId || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;
    const userId = userDetails?.id || 0;

    const localSessionId = localStorage.getItem('sessionId');
    const sessionId = this.sessionService.getSessionId() ? parseInt(this.sessionService.getSessionId() || '0', 10) : (localSessionId ? parseInt(localSessionId, 10) : 0);

    const selectedParty = this.partiesList().find(p => Number(p.id) === Number(partyId)) || this.customer;

    let tDate = new Date().toISOString();
    let rDate = new Date().toISOString();
    try {
      if (formValues.transactionDate) tDate = new Date(formValues.transactionDate).toISOString();
      if (formValues.chequeDate) rDate = new Date(formValues.chequeDate).toISOString();
    } catch (e) { }

    let modeId = 1;
    let modeName = 'Cash';
    if (formValues.paymentMode === 'cheque') {
      modeId = 2;
      modeName = 'Cheque';
    } else if (formValues.paymentMode === 'neft') {
      modeId = 3;
      modeName = 'NEFT/RTGS';
    } else if (formValues.paymentMode === 'upi') {
      modeId = 4;
      modeName = 'UPI';
    }

    const targetBankId = formValues.paymentMode === 'cash' ? 1177 : Number(formValues.ledger2);
    const foundBank = this.bankAccountsList().find(b => Number(b.id) === targetBankId);
    const selectedBankName = foundBank?.customerName || '';
    const bankLedgerId = Number(foundBank?.id || targetBankId || 0);

    const payload = {
      id: 0,
      ledger1: Number(partyId),
      ledger2: bankLedgerId,
      bankCashLedger: Number(formValues.ledger2 || 0),
      credit: amt,
      debit: 0,
      ledgerAmount: amt,
      transactionDate: tDate,
      modeOfPaymentId: modeId,
      modeOfPayment: modeName,
      transactionTypeId: 0,
      transactionType: '',
      transactionId: 0,
      transactionNo: formValues.transactionNo || '',
      narration: '',
      referenceId: 0,
      groupId: 0,
      chequeDate: rDate,
      isTallyExport: 0,
      tallyReferenceId: 0,
      particularsText: 'Deposit Received',
      voucherTypeId: 4,
      voucherSubTypeId: 3,
      voucherSubType: formValues.voucherSubType || 'Sale',
      fYearId: 0,
      unitId: unitId,
      organizationId: orgId,
      serverId: 0,
      createdBy: userId,
      createdDate: new Date().toISOString(),
      modifiedBy: userId,
      isOpeningBalance: 0,
      showDate: tDate,
      isDeleted: 0,
      billNumber: '',
      fBillId: 0,
      selectedPartyName: selectedParty?.customerName || '',
      selectedBankName: selectedBankName,
      remarks: formValues.remarks || '',
      inFavorPartyId: 0,
      inFavorPartyName: '',
      groupIdForBulk: 0,
      upiId: '',
      sessionId: sessionId
    };

    this.counterInvoiceService.addCustomerBalance(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess(`₹${amt} added successfully.`);
        this.isSaving.set(false);
        this.ledgerForm.patchValue({
          ledgerAmount: null,
          remarks: ''
        });

        this.updateIndexedDbBalance(amt, Number(partyId));

        this.balanceAdded.emit();
        this.closeDrawer();
      },
      error: (err: any) => {
        console.error('Error adding balance:', err);
        this.notificationService.showError('Failed to add customer balance.');
        this.isSaving.set(false);
      }
    });
  }

  async updateIndexedDbBalance(amt: number, partyId: number) {
    try {
      const currentCust = await this.dbService.customerList.get(partyId);
      if (currentCust) {
        const currentBalance = currentCust.balanceAtDairy || currentCust.balance || 0;
        const newBalance = currentBalance - amt;

        await this.dbService.customerList.update(partyId, {
          balanceAtDairy: newBalance,
          balance: newBalance
        });
      }
    } catch (e) {
      console.error('Failed to update IndexedDB balance', e);
    }
  }
}
