import { Component, Input, inject, signal, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Loader } from 'lucide-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../../../../core/adapters/custom-date-adapter';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CounterInvoiceService } from '../../../../../../core/services/counter-invoice.service';

@Component({
  selector: 'app-ledger-history',
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
  templateUrl: './ledger-history.html',
  styleUrl: './ledger-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LedgerHistoryComponent implements OnInit, OnChanges {
  private counterInvoiceService = inject(CounterInvoiceService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @Input() isOpen = false;
  @Input() customer: any = null;
  @Input() partiesList: any[] = [];
  @Input() combinedBankCashList: any[] = [];

  isLoading = signal<boolean>(false);
  ledgerHistory = signal<any[]>([]);
  filteredLedgerHistory = signal<any[]>([]);
  filterForm: FormGroup;

  displayedColumns: string[] = ['sr', 'date', 'billNo', 'credit', 'debit'];
  readonly LoaderIcon = Loader;

  compareFn(a: any, b: any): boolean {
    if (a === null || a === undefined || b === null || b === undefined) return a === b;
    return Number(a) === Number(b);
  }

  trackById(index: number, item: any): any {
    return item?.id ?? item?.customerId ?? item?.partyId ?? index;
  }

  constructor() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.filterForm = this.fb.group({
      partyId: [null, Validators.required],
      bankLedgerId: [null, Validators.required],
      fromDate: [thirtyDaysAgo, Validators.required],
      toDate: [new Date(), Validators.required]
    });

    this.filterForm.get('partyId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val) {
          this.loadLedgerHistory(val);
        }
      });

    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  ngOnInit() {
    this.initFilterState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true || (this.isOpen && changes['customer']?.currentValue) || changes['partiesList'] || changes['combinedBankCashList']) {
      this.initFilterState();
    }
  }

  initFilterState() {
    const today = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const rawCustId = this.customer?.id ?? this.customer?.customerId ?? this.customer?.partyId;
    let custId = rawCustId ? Number(rawCustId) : 0;

    if ((!custId || !this.partiesList.some(p => Number(p.id) === custId)) && this.partiesList.length > 0) {
      custId = Number(this.partiesList[0].id);
    }

    let defaultBankId = this.filterForm.get('bankLedgerId')?.value;
    if (!defaultBankId && this.combinedBankCashList.length > 0) {
      defaultBankId = this.combinedBankCashList[0].id;
    }

    this.filterForm.patchValue({
      partyId: custId > 0 ? custId : null,
      bankLedgerId: defaultBankId || null,
      fromDate: start,
      toDate: today
    }, { emitEvent: false });

    if (custId > 0) {
      this.loadLedgerHistory(custId);
    }
    this.cdr.detectChanges();
  }

  async loadLedgerHistory(selectedPartyId?: number) {
    const partyId = selectedPartyId || this.filterForm?.get('partyId')?.value || this.customer?.id;
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

    if (filters.bankLedgerId) {
      const bankId = Number(filters.bankLedgerId);
      filtered = filtered.filter(row =>
        Number(row.bankCashLedger) === bankId ||
        Number(row.ledger2) === bankId
      );
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(row => {
        const date = new Date(row.transactionDate || row.showDate);
        return date >= fromDate;
      });
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(row => {
        const date = new Date(row.transactionDate || row.showDate);
        return date <= toDate;
      });
    }

    this.filteredLedgerHistory.set(filtered);
    this.cdr.markForCheck();
  }
}
