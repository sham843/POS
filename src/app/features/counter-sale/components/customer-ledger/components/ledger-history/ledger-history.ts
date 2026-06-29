import { Component, Input, inject, signal, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Loader, Search, RotateCcw } from 'lucide-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../../../../../core/adapters/custom-date-adapter';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CounterInvoiceService } from '../../../../../../core/services/counter-invoice.service';
import { EmptyState } from '../../../../../../shared/components/empty-state/empty-state';

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
    MatTableModule,
    EmptyState
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

  maxDate: Date = new Date();

  displayedColumns: string[] = ['sr', 'date', 'billNo', 'credit', 'debit'];
  readonly LoaderIcon = Loader;
  readonly SearchIcon = Search;
  readonly RotateCcwIcon = RotateCcw;

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
      bankLedgerId: [null],
      fromDate: [thirtyDaysAgo, Validators.required],
      toDate: [new Date(), Validators.required]
    });

    this.filterForm.get('fromDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.filterForm.patchValue({ toDate: null }, { emitEvent: false });
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

    this.filterForm.patchValue({
      partyId: custId > 0 ? custId : null,
      bankLedgerId: null,
      fromDate: start,
      toDate: today
    }, { emitEvent: false });

    if (custId > 0) {
      this.loadLedgerHistory(custId);
    }
    this.cdr.detectChanges();
  }

  searchHistory() {
    const partyId = this.filterForm.get('partyId')?.value;
    if (partyId) {
      this.loadLedgerHistory(Number(partyId));
    }
  }

  resetFilters() {
    const today = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const rawCustId = this.customer?.id ?? this.customer?.customerId ?? this.customer?.partyId;
    let custId = rawCustId ? Number(rawCustId) : 0;
    if ((!custId || !this.partiesList.some(p => Number(p.id) === custId)) && this.partiesList.length > 0) {
      custId = Number(this.partiesList[0].id);
    }

    this.filterForm.patchValue({
      partyId: custId > 0 ? custId : null,
      bankLedgerId: null,
      fromDate: start,
      toDate: today
    });

    if (custId > 0) {
      this.loadLedgerHistory(custId);
    }
  }

  async loadLedgerHistory(selectedPartyId?: number) {
    const partyId = selectedPartyId || this.filterForm?.get('partyId')?.value || this.customer?.id;
    if (!partyId) return;
    this.isLoading.set(true);

    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }
    const orgId = userDetails?.organizationId || userDetails?.organizationid || 28;
    const unitId = userDetails?.unitid || userDetails?.unitId || 0;
    const userId = userDetails?.id || userDetails?.userId || 0;

    const fromDateVal = this.filterForm?.get('fromDate')?.value;
    const toDateVal = this.filterForm?.get('toDate')?.value;
    const fromDate = fromDateVal ? new Date(fromDateVal).toISOString() : undefined;
    const toDate = toDateVal ? new Date(toDateVal).toISOString() : undefined;

    this.counterInvoiceService.getCustomerLedger({
      partyId: Number(partyId),
      organizationId: orgId,
      unitId: unitId,
      userId: userId,
      fromDate: fromDate,
      toDate: toDate,
      pageNo: 1,
      pageSize: 1000
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const list = res?.responseData || res?.data || res || [];
          this.ledgerHistory.set(Array.isArray(list) ? list : []);
          this.applyFilters();
          this.isLoading.set(false);
          this.cdr.detectChanges();
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
