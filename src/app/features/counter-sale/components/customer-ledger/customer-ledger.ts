import { Component, Input, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, Plus, DollarSign, ReceiptText, ClipboardList, Loader } from 'lucide-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DbService } from '../../../../core/services/db.service';
import { CounterInvoiceService } from '../../../../core/services/counter-invoice.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfigService } from '../../../../core/services/config.service';

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
  providers: [provideNativeDateAdapter()],
  templateUrl: './customer-ledger.html',
  styleUrl: './customer-ledger.scss'
})
export class CustomerLedger {
  private dbService = inject(DbService);
  private counterInvoiceService = inject(CounterInvoiceService);
  private notificationService = inject(NotificationService);
  private configService = inject(ConfigService);
  private fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() customer: any = null;
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

  constructor() {
    this.ledgerForm = this.fb.group({
      partyId: [null, Validators.required],
      paymentMode: ['cash', Validators.required],
      bankCashLedgerId: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      transactionDate: [new Date(), Validators.required],
      receiptDate: [new Date(), Validators.required],
      subVoucherType: [''],
      transactionNo: [''],
      remark: ['']
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
    this.ledgerForm.get('partyId')?.valueChanges.subscribe(val => {
      if (val) {
        this.filterForm.patchValue({ partyId: val }, { emitEvent: false });
        this.loadLedgerHistory(val);
      }
    });

    this.filterForm.get('partyId')?.valueChanges.subscribe(val => {
      if (val) {
        this.ledgerForm.patchValue({ partyId: val }, { emitEvent: false });
        this.loadLedgerHistory(val);
      }
    });

    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });

    this.ledgerForm.get('paymentMode')?.valueChanges.subscribe(() => {
      this.updateBankCashLedgerDefault();
    });

    effect(() => {
      if (this.isOpen && this.customer) {
        const today = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        this.ledgerForm.patchValue({
          partyId: Number(this.customer.id),
          paymentMode: 'cash',
          amount: null,
          transactionDate: today,
          receiptDate: today,
          subVoucherType: '',
          transactionNo: '',
          remark: ''
        }, { emitEvent: false });

        this.filterForm.patchValue({
          partyId: Number(this.customer.id),
          fromDate: start,
          toDate: today
        }, { emitEvent: false });
        
        this.loadDropdownData().then(() => {
          this.loadLedgerHistory(Number(this.customer.id));
        });
      }
    });
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
      this.partiesList.set(parties);
      
      const banks = await this.dbService.bankAccounts.toArray();
      this.bankAccountsList.set(banks);
      
      const cash = await this.dbService.cashLedger.toArray();
      this.cashLedgersList.set(cash);

      // Combine cash and bank accounts
      const combined = [
        ...cash.map(c => ({ id: c.id, name: c.ledgerName || c.name || 'Cash', type: 'Cash' })),
        ...banks.map(b => ({ id: b.id, name: b.bankName || b.name || 'Bank', type: 'Bank' }))
      ];
      this.combinedBankCashList.set(combined);

      this.updateBankCashLedgerDefault();

      if (combined.length > 0 && !this.filterForm.get('bankLedgerId')?.value) {
        this.filterForm.patchValue({ bankLedgerId: combined[0].id }, { emitEvent: false });
      }
    } catch (e) {
      console.error('Error loading dropdown lists', e);
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
        this.ledgerForm.patchValue({ bankCashLedgerId: list[0].id });
      } else {
        this.ledgerForm.patchValue({ bankCashLedgerId: null });
      }
    } else {
      const list = this.bankAccountsList();
      if (list.length > 0) {
        this.ledgerForm.patchValue({ bankCashLedgerId: list[0].id });
      } else {
        this.ledgerForm.patchValue({ bankCashLedgerId: null });
      }
    }
  }

  async loadLedgerHistory(selectedPartyId?: number) {
    const partyId = selectedPartyId || this.filterForm?.get('partyId')?.value || this.ledgerForm.get('partyId')?.value || this.customer?.id;
    if (!partyId) return;
    this.isLoading.set(true);
    
    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }
    const orgId = userDetails?.organizationId || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;

    this.counterInvoiceService.getCustomerLedger(partyId, orgId, unitId).subscribe({
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
    const amt = formValues.amount;
    const partyId = formValues.partyId;

    this.isSaving.set(true);
    
    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }
    
    const orgId = userDetails?.organizationId || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;
    const userId = userDetails?.id || 0;

    let companyLedgerId = 0;
    try {
      const companyLedgers = await this.dbService.companyLedgerList.toArray();
      if (companyLedgers && companyLedgers.length > 0) {
        companyLedgerId = companyLedgers[0].id || 0;
      }
    } catch (e) {}

    const selectedParty = this.partiesList().find(p => Number(p.id) === Number(partyId)) || this.customer;

    let tDate = new Date().toISOString();
    let rDate = new Date().toISOString();
    try {
      if (formValues.transactionDate) tDate = new Date(formValues.transactionDate).toISOString();
      if (formValues.receiptDate) rDate = new Date(formValues.receiptDate).toISOString();
    } catch (e) {}

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

    const payload = {
      id: 0,
      ledger1: Number(partyId),
      ledger2: companyLedgerId,
      bankCashLedger: Number(formValues.bankCashLedgerId || 0),
      credit: amt,
      debit: 0,
      ledgerAmount: amt,
      transactionDate: tDate,
      modeOfPaymentId: modeId,
      modeOfPayment: modeName,
      transactionTypeId: 0,
      transactionType: 'Receipt',
      transactionId: 0,
      transactionNo: formValues.transactionNo || '',
      narration: formValues.remark || 'Customer Balance Received',
      referenceId: 0,
      groupId: 0,
      chequeDate: rDate,
      isTallyExport: 0,
      tallyReferenceId: 0,
      particularsText: formValues.remark || 'Customer Balance Received',
      voucherTypeId: 1,
      voucherSubTypeId: 0,
      voucherSubType: formValues.subVoucherType || '',
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
      selectedPartyName: selectedParty?.customerName || selectedParty?.name || '',
      selectedBankName: formValues.paymentMode === 'cash' ? 'Cash Sale' : 'Bank Transfer',
      remarks: formValues.remark || '',
      inFavorPartyId: 0,
      inFavorPartyName: '',
      groupIdForBulk: 0,
      upiId: ''
    };

    this.counterInvoiceService.addCustomerBalance(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess(`₹${amt} added successfully.`);
        this.isSaving.set(false);
        this.ledgerForm.patchValue({
          amount: null,
          remark: ''
        });
        
        this.updateIndexedDbBalance(amt, Number(partyId));
        
        this.balanceAdded.emit();
        this.activeTab.set('history');
        this.loadLedgerHistory();
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
