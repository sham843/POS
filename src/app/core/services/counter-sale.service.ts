import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';
import { DialogService } from './dialog.service';

export interface CartItem {
  product: any;
  details: string;
  quantity: number;
  rate: number;
  discount: number;
  amount: number;
  netAmount: number;
  gst: number;
  gstAmount: number;
  total: number;
  unit?: string;
}

export interface BillState {
  id: number;
  name: string;
  cartItems: CartItem[];
  selectedCustomer: any | null;
  selectedItemIndex: number | null;
  numpadMode: 'quantity' | 'amount' | 'discount';
  numpadValue: string;
  numpadShouldReplace: boolean;
  numpadHasQuickWeight: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CounterSaleService {
  notificationService = inject(NotificationService);
  apiService = inject(ApiService);
  dialogService = inject(DialogService);

  searchQuery = signal<string>('');
  searchType = signal<'product' | 'bill' | 'customer'>('product');

  bills = signal<BillState[]>([]);
  activeBillId = signal<number>(1);

  activeBill = computed(() => this.bills().find(b => b.id === this.activeBillId()) || this.bills()[0]);
  
  cartItems = computed(() => this.activeBill()?.cartItems || []);
  selectedItemIndex = computed(() => this.activeBill()?.selectedItemIndex ?? null);
  numpadMode = computed(() => this.activeBill()?.numpadMode || 'quantity');
  numpadValue = computed(() => this.activeBill()?.numpadValue || '');
  selectedCustomer = computed(() => this.activeBill()?.selectedCustomer || null);

  get numpadShouldReplace() { return this.activeBill()?.numpadShouldReplace || false; }
  set numpadShouldReplace(val: boolean) { this.updateActiveBill({ numpadShouldReplace: val }); }

  get numpadHasQuickWeight() { return this.activeBill()?.numpadHasQuickWeight || false; }
  set numpadHasQuickWeight(val: boolean) { this.updateActiveBill({ numpadHasQuickWeight: val }); }

  // Computed totals for bill summary
  subTotal = computed(() => this.cartItems().reduce((acc, item) => acc + item.amount, 0));
  totalDiscount = computed(() => this.cartItems().reduce((acc, item) => acc + (item.amount * item.discount / 100), 0));
  taxableAmount = computed(() => this.subTotal() - this.totalDiscount());
  totalGst = computed(() => this.cartItems().reduce((acc, item) => acc + item.gstAmount, 0));
  billAmount = computed(() => this.taxableAmount() + this.totalGst());
  roundOff = computed(() => Math.ceil(this.billAmount()) - this.billAmount());
  totalPayable = computed(() => Math.ceil(this.billAmount()));

  private searchSubject = new Subject<string>();

  constructor() {
    this.bills.set([this.createEmptyBill(1)]);
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
    });
  }

  createEmptyBill(id: number): BillState {
    return {
      id,
      name: `Bill ${id}`,
      cartItems: [],
      selectedCustomer: null,
      selectedItemIndex: null,
      numpadMode: 'quantity',
      numpadValue: '',
      numpadShouldReplace: false,
      numpadHasQuickWeight: false
    };
  }

  updateActiveBill(updates: Partial<BillState>) {
    this.bills.update(bills => bills.map(b => 
      b.id === this.activeBillId() ? { ...b, ...updates } : b
    ));
  }

  addBill() {
    if (this.bills().length >= 5) return;
    const newId = (this.bills()[this.bills().length - 1]?.id || 0) + 1;
    this.bills.update(bills => [...bills, this.createEmptyBill(newId)]);
    this.activeBillId.set(newId);
  }

  selectBill(id: number) {
    this.activeBillId.set(id);
  }

  removeBill(id: number) {
    const currentBills = this.bills();
    if (currentBills.length === 1) return;
    
    const activeWasRemoved = this.activeBillId() === id;
    let nextActiveId = this.activeBillId();
    if (activeWasRemoved) {
       const idx = currentBills.findIndex(b => b.id === id);
       nextActiveId = currentBills[idx === currentBills.length - 1 ? idx - 1 : idx + 1].id;
    }

    const remainingBills = currentBills.filter(b => b.id !== id);
    let newActiveId = 1;
    const renumbered = remainingBills.map((b, i) => {
      const newId = i + 1;
      if (b.id === nextActiveId) newActiveId = newId;
      return { ...b, id: newId, name: `Bill ${newId}` };
    });

    this.bills.set(renumbered);
    this.activeBillId.set(newActiveId);
  }

  updateSearchQuery(query: string) {
    this.searchSubject.next(query);
  }

  selectItem(index: number | null) {
    if (this.selectedItemIndex() !== null) {
      const oldIdx = this.selectedItemIndex()!;
      if (oldIdx < this.cartItems().length) {
        const item = this.cartItems()[oldIdx];
        if (this.numpadMode() === 'amount' && item.netAmount <= 0) {
          this.notificationService.showError(`Amount cannot be zero.`);
          // Revert amount to rate * quantity as a fallback
          const isExcluded = (item.product?.computationMethod || '').toUpperCase().includes('EXCLUDED');
          item.amount = isExcluded
            ? Math.round((item.rate * item.quantity) * 100) / 100
            : Math.round(((item.rate * item.quantity) / (1 + item.gst / 100)) * 100) / 100;
          item.netAmount = Math.round((item.amount - (item.amount * item.discount / 100)) * 100) / 100;
          item.gstAmount = Math.round((item.netAmount * item.gst / 100) * 100) / 100;
          item.total = Math.round((item.netAmount + item.gstAmount) * 100) / 100;
        }
      }
    }

    if (this.selectedItemIndex() !== index) {
      this.numpadShouldReplace = true;
      this.numpadHasQuickWeight = false;
    }
    this.updateActiveBill({ selectedItemIndex: index });
    this.syncNumpadFromCart();
  }

  setNumpadMode(mode: 'quantity' | 'amount' | 'discount') {
    if (this.selectedItemIndex() !== null && this.numpadMode() === 'amount' && mode !== 'amount') {
      const idx = this.selectedItemIndex()!;
      if (idx < this.cartItems().length) {
        const item = this.cartItems()[idx];
        if (item.netAmount <= 0) {
          this.notificationService.showError(`Amount cannot be zero.`);
          const isExcluded = (item.product?.computationMethod || '').toUpperCase().includes('EXCLUDED');
          item.amount = isExcluded
            ? Math.round((item.rate * item.quantity) * 100) / 100
            : Math.round(((item.rate * item.quantity) / (1 + item.gst / 100)) * 100) / 100;
          item.netAmount = Math.round((item.amount - (item.amount * item.discount / 100)) * 100) / 100;
          item.gstAmount = Math.round((item.netAmount * item.gst / 100) * 100) / 100;
          item.total = Math.round((item.netAmount + item.gstAmount) * 100) / 100;
        }
      }
    }

    this.updateActiveBill({ numpadMode: mode });
    this.numpadShouldReplace = true;
    this.numpadHasQuickWeight = false;
    this.syncNumpadFromCart();
  }

  syncNumpadFromCart() {
    const idx = this.selectedItemIndex();
    if (idx !== null && idx >= 0 && idx < this.cartItems().length) {
      const item = this.cartItems()[idx];
      const mode = this.numpadMode();
      if (mode === 'quantity') {
        this.updateActiveBill({ numpadValue: item.quantity.toString() });
      } else if (mode === 'amount') {
        this.updateActiveBill({ numpadValue: item.netAmount.toString() });
      } else if (mode === 'discount') {
        this.updateActiveBill({ numpadValue: item.discount === 0 ? '' : item.discount.toString() });
      }
    } else {
      this.updateActiveBill({ numpadValue: '' });
    }
  }

  handleNumpadInput(val: string) {
    const idx = this.selectedItemIndex();
    if (idx === null || idx < 0 || idx >= this.cartItems().length) return;

    let currentVal = this.numpadValue();
    // let oldVal = currentVal;

    if (this.numpadShouldReplace && val !== 'backspace' && val !== 'clear') {
      if (!val.startsWith('.')) {
        currentVal = this.numpadMode() === 'discount' ? '' : '0';
        this.numpadHasQuickWeight = false;
      }
    }
    this.numpadShouldReplace = false;

    if (val === 'backspace') {
      if (this.numpadMode() === 'quantity' && this.numpadHasQuickWeight && currentVal.includes('.')) {
        const parts = currentVal.split('.');
        if (parts[0].length > 1) {
          currentVal = parts[0].slice(0, -1) + '.' + parts[1];
        } else if (parts[0] !== '0') {
          currentVal = '0.' + parts[1];
        } else {
          currentVal = '1';
          this.numpadHasQuickWeight = false;
          this.numpadShouldReplace = true;
        }
      } else {
        currentVal = currentVal.slice(0, -1);
        if (currentVal === '' || (this.numpadMode() === 'quantity' && currentVal === '0')) {
          if (this.numpadMode() === 'quantity') {
            currentVal = '1';
            this.numpadShouldReplace = true;
          } else if (this.numpadMode() === 'amount') {
            currentVal = '0';
          } else {
            currentVal = '';
          }
        }
      }
    } else if (val === 'clear') {
      if (this.numpadMode() === 'quantity') {
        currentVal = '1';
        this.numpadShouldReplace = true;
      } else if (this.numpadMode() === 'amount') {
        currentVal = '0';
      } else {
        currentVal = '';
      }
      this.numpadHasQuickWeight = false;
    } else if (val.startsWith('.')) {
      if (val.length > 1) { // Quick weight (.125, .250, etc)
        if (currentVal.includes('.')) {
          currentVal = currentVal.split('.')[0] + val;
        } else {
          currentVal = (currentVal || '0') + val;
        }
        this.numpadHasQuickWeight = true;
      } else { // Manual dot
        if (!currentVal.includes('.')) {
          currentVal = (currentVal || '0') + val;
        }
        this.numpadHasQuickWeight = false;
      }
    } else { // Numeric digit
      if (this.numpadMode() === 'quantity' && this.numpadHasQuickWeight && currentVal.includes('.')) {
        const parts = currentVal.split('.');
        currentVal = (parts[0] === '0' ? val : parts[0] + val) + '.' + parts[1];
      } else if (currentVal.includes('.')) {
        const parts = currentVal.split('.');
        let maxDecimals = 0;
        if (this.numpadMode() === 'discount' || this.numpadMode() === 'amount') {
          maxDecimals = 2;
        } else if (this.numpadMode() === 'quantity') {
          maxDecimals = 3;
        }

        if (parts[1].length < maxDecimals) {
          currentVal += val;
        }
      } else {
        if (currentVal === '0' || currentVal === '') {
          currentVal = val;
        } else {
          currentVal += val;
        }
      }
    }

    if (this.numpadMode() === 'discount') {
      if (parseFloat(currentVal) > environment.maxDiscount) {
        currentVal = environment.maxDiscount.toString();
        this.notificationService.showError(`Discount cannot exceed ${environment.maxDiscount}%`);
      }
    }

    this.updateActiveBill({ numpadValue: currentVal });
    this.syncCartFromNumpad();
  }

  setNumpadValueExplicit(val: string) {
    const idx = this.selectedItemIndex();
    if (idx === null || idx < 0 || idx >= this.cartItems().length) return;
    this.updateActiveBill({ numpadValue: val });
    this.syncCartFromNumpad();
  }

  syncCartFromNumpad() {
    const idx = this.selectedItemIndex();
    if (idx === null) return;
    const mode = this.numpadMode();
    const valStr = this.numpadValue();
    const valNum = parseFloat(valStr) || 0;

    const items = [...this.cartItems()];
    const item = items[idx];

    if (mode === 'quantity') {
      item.quantity = valNum;
      const isExcluded = (item.product?.computationMethod || '').toUpperCase().includes('EXCLUDED');
      item.amount = isExcluded
        ? Math.round((item.rate * item.quantity) * 100) / 100
        : Math.round(((item.rate * item.quantity) / (1 + item.gst / 100)) * 100) / 100;
    } else if (mode === 'amount') {
      if (item.product?.mensurationUnit === 'Nos') {
        this.syncNumpadFromCart();
        return;
      }
      const netAmount = Math.round(valNum * 100) / 100;
      const discountFactor = 1 - (item.discount / 100);
      if (discountFactor > 0) {
        item.amount = Math.round((netAmount / discountFactor) * 100) / 100;
      } else {
        item.amount = netAmount;
      }
      if (item.rate > 0) {
        const isExcluded = (item.product?.computationMethod || '').toUpperCase().includes('EXCLUDED');
        if (isExcluded) {
          item.quantity = Math.round((item.amount / item.rate) * 1000) / 1000;
        } else {
          item.quantity = Math.round(((item.amount * (1 + item.gst / 100)) / item.rate) * 1000) / 1000;
        }
      }
    } else if (mode === 'discount') {
      item.discount = valNum;
    }

    item.netAmount = Math.round((item.amount - (item.amount * item.discount / 100)) * 100) / 100;
    item.gstAmount = Math.round((item.netAmount * item.gst / 100) * 100) / 100;
    item.total = Math.round((item.netAmount + item.gstAmount) * 100) / 100;

    this.updateActiveBill({ cartItems: items });
  }

  addToCart(product: any) {
    const items = [...this.cartItems()];
    const existingItemIndex = items.findIndex(item =>
      (item.product.id && item.product.id === product.id) ||
      (item.product.productCode && item.product.productCode === product.productCode) ||
      (item.details === (product.productName || product.materialName || product.name))
    );

    if (existingItemIndex > -1) {
      this.updateQuantity(existingItemIndex, items[existingItemIndex].quantity + 1);
      this.selectItem(existingItemIndex);
    } else {
      const rate = product.salePrice || product.mrp || product.rate || product.price || product.saleRate || 0;
      const gst = product.gst || product.taxPercentage || 0;
      const isExcluded = (product.computationMethod || '').toUpperCase().includes('EXCLUDED');
      const amount = isExcluded
        ? Math.round((rate * 1) * 100) / 100
        : Math.round(((rate * 1) / (1 + gst / 100)) * 100) / 100;
      const netAmount = amount;
      const gstAmount = Math.round((netAmount * gst / 100) * 100) / 100;
      const newItem: CartItem = {
        product: product,
        details: product.productName || product.materialName || product.name || 'Unknown Product',
        quantity: 1,
        rate: rate,
        discount: 0,
        amount: amount,
        netAmount: netAmount,
        gst: gst,
        gstAmount: gstAmount,
        total: Math.round((netAmount + gstAmount) * 100) / 100,
        unit: product.unit || product.uom || product.unitName || product.mensurationUnit || ''
      };
      items.push(newItem);
      this.updateActiveBill({ cartItems: items });
      this.selectItem(items.length - 1);
    }
  }

  updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(index);
      return;
    }
    const items = [...this.cartItems()];
    const item = items[index];
    item.quantity = quantity;
    const isExcluded = (item.product?.computationMethod || '').toUpperCase().includes('EXCLUDED');
    item.amount = isExcluded
      ? Math.round((item.rate * item.quantity) * 100) / 100
      : Math.round(((item.rate * item.quantity) / (1 + item.gst / 100)) * 100) / 100;
    item.netAmount = Math.round((item.amount - (item.amount * item.discount / 100)) * 100) / 100;
    item.gstAmount = Math.round((item.netAmount * item.gst / 100) * 100) / 100;
    item.total = Math.round((item.netAmount + item.gstAmount) * 100) / 100;
    this.updateActiveBill({ cartItems: items });

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  updateAmount(index: number, amount: number) {
    const items = [...this.cartItems()];
    const item = items[index];
    if (item.product?.mensurationUnit === 'Nos') {
      this.syncNumpadFromCart();
      return;
    }
    const netAmount = Math.round(amount * 100) / 100;
    const discountFactor = 1 - (item.discount / 100);
    if (discountFactor > 0) {
      item.amount = Math.round((netAmount / discountFactor) * 100) / 100;
    } else {
      item.amount = netAmount;
    }
    if (item.rate > 0) {
      const isExcluded = (item.product?.computationMethod || '').toUpperCase().includes('EXCLUDED');
      if (isExcluded) {
        item.quantity = Math.round((item.amount / item.rate) * 1000) / 1000;
      } else {
        item.quantity = Math.round(((item.amount * (1 + item.gst / 100)) / item.rate) * 1000) / 1000;
      }
    }
    item.netAmount = Math.round((item.amount - (item.amount * item.discount / 100)) * 100) / 100;
    item.gstAmount = Math.round((item.netAmount * item.gst / 100) * 100) / 100;
    item.total = Math.round((item.netAmount + item.gstAmount) * 100) / 100;
    this.updateActiveBill({ cartItems: items });

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  updateDiscount(index: number, discount: number) {
    const items = [...this.cartItems()];
    const item = items[index];
    item.discount = discount || 0;
    item.netAmount = Math.round((item.amount - (item.amount * item.discount / 100)) * 100) / 100;
    item.gstAmount = Math.round((item.netAmount * item.gst / 100) * 100) / 100;
    item.total = Math.round((item.netAmount + item.gstAmount) * 100) / 100;
    this.updateActiveBill({ cartItems: items });

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  removeItem(index: number) {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.updateActiveBill({ cartItems: items });

    if (this.selectedItemIndex() === index) {
      this.selectItem(items.length > 0 ? items.length - 1 : null);
    } else if (this.selectedItemIndex() !== null && this.selectedItemIndex()! > index) {
      this.updateActiveBill({ selectedItemIndex: this.selectedItemIndex()! - 1 });
    }
  }

  clearCart() {
    this.updateActiveBill({
      cartItems: [],
      selectedCustomer: null,
      selectedItemIndex: null,
      numpadMode: 'quantity',
      numpadValue: '',
      numpadShouldReplace: false,
      numpadHasQuickWeight: false
    });
  }

  saveInvoice(paymentMode: 'cash' | 'online' | 'card', printAutomatically: boolean) {
    if (this.cartItems().length === 0 || this.totalPayable() === 0) {
      this.notificationService.showError("The invoice total is ₹0. Please select a product before payment.");
      return;
    }

    const invalidItems = this.cartItems().filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      this.notificationService.showError("One or more items have quantity 0. Please correct them before proceeding.");
      return;
    }

    const now = new Date().toISOString();
    const userDetailsStr = localStorage.getItem('UserDetails');
    let userDetails: any = null;
    try { if (userDetailsStr) userDetails = JSON.parse(userDetailsStr); } catch (e) { }

    const unitId = userDetails?.unitid || userDetails?.unitId || 0;
    const userId = userDetails?.id || 0;
    const organizationId = userDetails?.organizationId || 0;

    // Determine counterSaleTypeId and Mode properties
    let counterSaleTypeId = 1; // 1=Cash
    let modeOfPaymentId = 1;
    let modeString = "Cash";
    let isPaymentReceived = 1;

    if (paymentMode === 'online') {
      counterSaleTypeId = 2;
      modeOfPaymentId = 4;
      modeString = "Online";
    } else if (paymentMode === 'card') {
      const billingType = this.selectedCustomer()?.billingType?.toLowerCase();
      counterSaleTypeId = billingType === 'prepaid' ? 4 : 3;
      modeOfPaymentId = 0;
      modeString = "Credit/Coupon";
      isPaymentReceived = 0;
    }

    const customer = this.selectedCustomer();
    const partyId = customer ? (customer.id || 0) : 0;
    const companyLedgerId = 0; // Should map properly if exists
    const bankCashLedger = paymentMode === 'cash' ? 0 : 0; // Or whatever selected bank

    const invoiceDetails = this.cartItems().map(item => {
      // Assuming item.discount is a percentage. For flat rupee amount logic, you'd adapt here.
      const discountAmount = parseFloat((item.amount * item.discount / 100).toFixed(2));
      const gstonAmount = parseFloat(((item.quantity * item.rate) - (discountAmount + item.gstAmount)).toFixed(2));

      return {
        id: 0,
        dcDetailsId: 0,
        invoiceId: 0,
        materialId: item.product?.id || item.product?.code || 0,
        materialUnitId: item.product?.unitId || item.product?.materialUnitId || 0,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        total: item.total,
        purchaseOrderId: 0,
        discountAmount: discountAmount,
        gstonAmount: gstonAmount,
        igst: "0.00", // Ignoring IGST for now as per ref default MH state
        cgst: (item.gstAmount / 2).toFixed(2),
        sgst: (item.gstAmount / 2).toFixed(2),
        subTotal: item.amount.toFixed(2),
        unitId: unitId,
        serverId: 0,
        StockHistoryLocalId: 0
      };
    });

    const payload = {
      sessionId: null,
      createdDate: now,
      modifiedDate: now,
      isDeleted: false,
      id: 0,
      invoiceDate: now,
      partyId: partyId,
      companyLedgerId: companyLedgerId,
      createdBy: userId,
      modifiedBy: userId,
      voucherTypeId: 1,
      discountAmount: this.totalDiscount().toFixed(2),
      totalAmount: this.subTotal().toFixed(2),
      roundOff: this.roundOff().toFixed(2),
      paymentNote: "",
      deliveryNote: "",
      deliveryNoteDate: "",
      supplierBillNo: "",
      supplierBillDate: "",
      supplerRefNo: "",
      otherRefNo: "",
      buyerPONumber: "",
      buyerPODate: "",
      dispatchDetails: "",
      termsOfDelivery: "",
      purchaseOrderNo: "",
      purchaseOrderDate: "",
      isBillPaid: 1,
      invoiceType: 1,
      purchaseOrderId: 0,
      isTallyExport: 0,
      returnInvoiceId: 0,
      counterNo: 0,
      counterSaleTypeId: counterSaleTypeId,
      isCounterSale: 1,
      unitId: unitId,
      serverId: 0,
      chalanNo: 0,
      invoiceNo: "",
      fYearId: 0,
      igst: "0.00",
      cgst: (this.totalGst() / 2).toFixed(2),
      sgst: (this.totalGst() / 2).toFixed(2),
      stateFlag: 1,
      isPaymentReceived: isPaymentReceived,
      isPrint: printAutomatically,
      spinvoicedetailsModel: invoiceDetails,
      ledgerTransaction: {
        id: 0,
        ledger1: partyId,
        ledger2: companyLedgerId,
        bankCashLedger: bankCashLedger,
        credit: this.totalPayable(),
        debit: this.totalPayable(),
        ledgerAmount: this.subTotal().toFixed(2),
        transactionDate: now,
        modeOfPaymentId: modeOfPaymentId,
        modeOfPayment: modeString,
        transactionTypeId: 0,
        transactionType: "",
        transactionId: 0,
        transactionNo: "",
        narration: modeString + " Payment",
        referenceId: 0,
        groupId: 0,
        chequeDate: now,
        isTallyExport: 0,
        tallyReferenceId: 0,
        particularsText: modeString + " Payment",
        voucherTypeId: 1,
        voucherSubTypeId: 0,
        voucherSubType: "",
        fYearId: 0,
        unitId: unitId,
        organizationId: organizationId,
        serverId: 0,
        createdBy: userId,
        createdDate: now,
        modifiedBy: userId,
        isOpeningBalance: 0,
        showDate: now,
        isDeleted: 0,
        billNumber: "",
        fBillId: 0,
        selectedPartyName: customer ? (customer.customerName || customer.name) : 'Daily Cash Counter Party',
        selectedBankName: paymentMode === 'cash' ? 'Cash Sale' : modeString,
        remarks: "",
        inFavorPartyId: 0,
        inFavorPartyName: "",
        groupIdForBulk: 0,
        upiId: ""
      }
    };

    const amountPaid = this.totalPayable();

    this.apiService.post('api/v1/invoice/sale', payload).subscribe({
      next: (_res) => {
        this.clearCart();
        this.dialogService.openConfirmDialog({
          title: 'Bill Generated Successfully!',
          message: `Payment of ₹${amountPaid} received via ${modeString}.`,
          type: 'success',
          confirmText: 'OK',
          hideCancel: true
        });
      },
      error: (err) => {
        console.error('Failed to generate bill:', err);
        this.notificationService.showError('Failed to generate bill');
      }
    });
  }
}
