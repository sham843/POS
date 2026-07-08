import { Component, Input, Output, EventEmitter, inject, signal, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Plus, DollarSign, ReceiptText, ClipboardList, Loader } from 'lucide-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../../../../core/adapters/custom-date-adapter';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DbService } from '../../../../../../core/services/db.service';
import { CounterInvoiceService } from '../../../../../../core/services/counter-invoice.service';
import { NotificationService } from '../../../../../../core/services/notification.service';
import { SessionService } from '../../../../../../core/services/session.service';

@Component({
  selector: 'app-add-balance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }
  ],
  templateUrl: './add-balance.html',
  styleUrl: './add-balance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddBalanceComponent implements OnInit, OnChanges {
  private dbService = inject(DbService);
  private counterInvoiceService = inject(CounterInvoiceService);
  private notificationService = inject(NotificationService);
  private sessionService = inject(SessionService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Input() isOpen = false;
  @Input() customer: any = null;
  @Input() partiesList: any[] = [];
  @Input() bankAccountsList: any[] = [];
  @Input() cashLedgersList: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() balanceAdded = new EventEmitter<void>();

  isSaving = signal<boolean>(false);
  ledgerForm: FormGroup;
  maxDate: Date = new Date();

  // Icons
  readonly PlusIcon = Plus;
  readonly DollarSignIcon = DollarSign;
  readonly ReceiptTextIcon = ReceiptText;
  readonly ClipboardListIcon = ClipboardList;
  readonly LoaderIcon = Loader;

  compareFn(a: any, b: any): boolean {
    if (a === null || a === undefined || b === null || b === undefined) return a === b;
    return Number(a) === Number(b);
  }

  trackById(index: number, item: any): any {
    return item?.id ?? item?.customerId ?? item?.partyId ?? index;
  }

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

    this.ledgerForm.get('transactionDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.ledgerForm.get('chequeDate')?.value) {
          this.ledgerForm.patchValue({ chequeDate: null });
        }
      });

    this.ledgerForm.get('paymentMode')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateBankCashLedgerDefault();
      });
  }

  ngOnInit() {
    this.initFormState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true || (this.isOpen && changes['customer']?.currentValue) || changes['partiesList']) {
      this.initFormState();
    }
  }

  initFormState() {
    const today = new Date();
    const rawCustId = this.customer?.id ?? this.customer?.customerId ?? this.customer?.partyId;
    let custId = rawCustId ? Number(rawCustId) : 0;

    if ((!custId || !this.partiesList.some(p => Number(p.id) === custId)) && this.partiesList.length > 0) {
      custId = Number(this.partiesList[0].id);
    }

    this.ledgerForm.patchValue({
      ledger1: custId > 0 ? custId : null,
      paymentMode: 'cash',
      ledgerAmount: null,
      transactionDate: today,
      chequeDate: today,
      voucherSubType: 'Sale',
      transactionNo: '',
      remarks: ''
    }, { emitEvent: false });

    this.updateBankCashLedgerDefault();
    this.cdr.detectChanges();
  }

  setPaymentMode(mode: 'cash' | 'cheque' | 'neft' | 'upi') {
    this.ledgerForm.patchValue({ paymentMode: mode });
  }

  updateBankCashLedgerDefault() {
    const paymentMode = this.ledgerForm.get('paymentMode')?.value;
    if (paymentMode === 'cash') {
      if (this.cashLedgersList.length > 0) {
        this.ledgerForm.patchValue({ ledger2: this.cashLedgersList[0].id });
      } else {
        this.ledgerForm.patchValue({ ledger2: null });
      }
    } else {
      this.ledgerForm.patchValue({ ledger2: null });
    }
  }

  closeDrawer() {
    this.close.emit();
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

    const selectedParty = this.partiesList.find(p => Number(p.id) === Number(partyId)) || this.customer;

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
    const foundBank = this.bankAccountsList.find(b => Number(b.id) === targetBankId);
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
      next: async () => {
        this.notificationService.showSuccess(`₹${amt} added successfully.`);
        this.isSaving.set(false);
        this.ledgerForm.patchValue({
          ledgerAmount: null,
          remarks: ''
        });

        await this.updateIndexedDbBalance(amt, Number(partyId));
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
        // The API treats this as adding to the balance (e.g. adding previous due)
        const newBalance = currentBalance + amt;

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
