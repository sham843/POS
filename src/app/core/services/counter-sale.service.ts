import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, groupBy, mergeMap } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { DbService } from './db.service';
import { SessionService } from './session.service';
import { CounterInvoiceService } from './counter-invoice.service';
import { CounterNumpadService } from './counter-numpad.service';

export interface Product {
  id?: string | number | null;
  productId?: string | number | null;
  productCode?: string | null;
  code?: string | number | null;
  materialCode?: string | null;
  unitId?: string | number | null;
  materialUnitId?: string | number | null;
  productName?: string | null;
  materialName?: string | null;
  name?: string | null;
  salePrice?: number | null;
  mrp?: number | null;
  rate?: number | null;
  price?: number | null;
  saleRate?: number | null;
  gst?: number | null;
  taxPercentage?: number | null;
  unit?: string | null;
  uom?: string | null;
  unitName?: string | null;
  mensurationUnit?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  [key: string]: any;
}

export interface DynamicTax {
  id: number;
  componentName: string;
  taxAmount: number;
  taxPercentage: number;
}

export interface CartItem {
  product: Product;
  details: string;
  quantity: number;
  rate: number;
  discount: number;
  discountRupee?: number;
  amount: number;
  netAmount: number;
  gst: number;
  gstAmount: number;
  total: number;
  unit?: string;
  isTaxIncluded?: boolean;
  dynamicTaxes?: DynamicTax[];
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
  loadedOrder?: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class CounterSaleService {
  notificationService = inject(NotificationService);
  dbService = inject(DbService);
  sessionService = inject(SessionService);
  counterInvoiceService = inject(CounterInvoiceService);
  counterNumpadService = inject(CounterNumpadService);

  get Userdetails() {
    const userStr = localStorage.getItem('UserDetails');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        return parsed;
      } catch (e) {
      }
    }
    return { id: 0 };
  }

  searchQuery = signal<string>('');
  searchType = signal<'product' | 'bill' | 'customer'>('product');

  bills = signal<BillState[]>([]);
  activeBillId = signal<number>(1);

  sessionBillStats = signal<{ bills: number, totalAmount: number, previousBillNo: string }>({ bills: 0, totalAmount: 0, previousBillNo: '' });
  invoiceHeader = {
    loadedInvoiceDate: signal<string | null>(null),
    invoiceDate: signal<string | null>(null),
    invoiceNo: signal<string | null>(null),
    invoiceId: signal<number | null>(null)
  };

  fetchSessionBillStats() {
    const userId = this.Userdetails.id;
    this.counterInvoiceService.fetchSessionBillStats(userId).subscribe({
      next: (res) => {
        const data = res?.data || res || {};
        let prevBillNo = data.previousBillNo ?? data.lastBillNo ?? data.previousBill ?? data.lastInvoiceNo ?? '';
        if (typeof prevBillNo === 'string' && prevBillNo.includes('/')) {
          prevBillNo = prevBillNo.split('/')[0];
        }

        this.sessionBillStats.set({
          bills: data.billsCount ?? data.totalBills ?? data.bills ?? 0,
          totalAmount: data.totalAmount ?? data.totalSales ?? data.salesAmount ?? data.sales ?? 0,
          previousBillNo: prevBillNo
        });
      },
      error: (err) => console.error('Failed to fetch session bill stats', err)
    });
  }

  activeBill = computed(() => this.bills().find(b => b.id === this.activeBillId()) || this.bills()[0]);

  cartItems = computed(() => this.activeBill()?.cartItems || []);
  loadedOrder = computed(() => this.activeBill()?.loadedOrder || null);
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
  taxableAmount = computed(() => this.cartItems().reduce((acc, item) => acc + item.netAmount, 0));
  totalDiscount = computed(() => this.subTotal() - this.taxableAmount());
  totalGst = computed(() => this.cartItems().reduce((acc, item) => acc + item.gstAmount, 0));
  totalCgst = computed(() => this.cartItems().reduce((acc, item) => acc + (item.dynamicTaxes?.find(t => t.componentName.includes('CGST'))?.taxAmount || (item.gstAmount / 2)), 0));
  totalSgst = computed(() => this.cartItems().reduce((acc, item) => acc + (item.dynamicTaxes?.find(t => t.componentName.includes('SGST'))?.taxAmount || (item.gstAmount / 2)), 0));
  totalIgst = computed(() => this.cartItems().reduce((acc, item) => acc + (item.dynamicTaxes?.find(t => t.componentName.includes('IGST'))?.taxAmount || 0), 0));
  billAmount = computed(() => this.taxableAmount() + this.totalGst());
  total = computed(() => this.cartItems().reduce((acc, item) => acc + item.total, 0));
  roundOff = computed(() => Math.ceil(this.billAmount()) - this.billAmount());
  totalPayable = computed(() => Math.ceil(this.billAmount()));

  private searchSubject = new Subject<string>();
  private taxSyncSubject = new Subject<{ billId: number, idx: number, item: CartItem, custStateCode: number, orgStateCode: number }>();

  constructor() {
    this.bills.set([this.createEmptyBill(1)]);
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
    });

    this.taxSyncSubject.pipe(
      groupBy(req => `${req.billId}-${req.idx}`),
      mergeMap(group => group.pipe(
        debounceTime(300),
        switchMap(async req => {
          const materialId = req.item.product.id;
          let totalPrice = req.item.quantity * req.item.rate;
          if (req.item.discount > 0) {
            totalPrice = totalPrice - (totalPrice * req.item.discount / 100);
          } else {
            totalPrice = totalPrice - (req.item.discountRupee || 0);
          }

          if (this.numpadMode() === 'amount') {
            totalPrice = req.item.total || req.item.amount;
          }

          try {
            const res = await this.counterInvoiceService.computeTax(
              Number(materialId),
              totalPrice,
              req.custStateCode,
              req.orgStateCode
            ).toPromise();
            return { req, res };
          } catch (e) {
            console.error('Tax API failed', e);
            return { req, res: null };
          }
        })
      ))
    ).subscribe(({ req, res }) => {
      if (!res) return;
      const data = res.data || res;

      const bills = this.bills();
      const billIdx = bills.findIndex(b => b.id === req.billId);
      if (billIdx === -1) return;

      const bill = bills[billIdx];
      if (req.idx >= bill.cartItems.length) return;

      const item = { ...bill.cartItems[req.idx] };
      if ((item.product.id || item.product.code) !== (req.item.product.id || req.item.product.code)) return;

      item.netAmount = data.taxableAmount ?? item.netAmount;
      item.netAmount = data.taxableAmount ?? item.netAmount;
      if (item.discount > 0) {
        item.amount = Math.round((item.netAmount / (1 - (item.discount / 100))) * 100) / 100;
      } else if ((item.discountRupee || 0) > 0) {
        item.amount = item.netAmount + (item.discountRupee || 0);
      } else {
        item.amount = item.netAmount;
      }
      item.total = data.afterTaxTotal ?? item.total;
      item.isTaxIncluded = data.isTaxIncluded ?? item.isTaxIncluded;

      if (data.dynamicTaxes && Array.isArray(data.dynamicTaxes)) {
        item.dynamicTaxes = data.dynamicTaxes;
        item.gstAmount = data.dynamicTaxes.reduce((sum: number, t: any) => sum + (t.taxAmount || 0), 0);
        item.gst = data.dynamicTaxes.reduce((sum: number, t: any) => sum + (t.taxPercentage || 0), 0);
      }

      const updatedCartItems = [...bill.cartItems];
      updatedCartItems[req.idx] = item;

      this.bills.update(allBills => allBills.map(b => b.id === req.billId ? { ...b, cartItems: updatedCartItems } : b));
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
      numpadHasQuickWeight: false,
      loadedOrder: null
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
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  selectItem(index: number | null) {
    if (this.selectedItemIndex() !== null) {
      const oldIdx = this.selectedItemIndex()!;
      if (oldIdx < this.cartItems().length) {
        const item = this.cartItems()[oldIdx];
        if (this.numpadMode() === 'amount' && item.netAmount <= 0) {
          this.notificationService.showError(`Amount cannot be zero.`);
          const items = [...this.cartItems()];
          items[oldIdx] = this.counterNumpadService.updateCartItemFromNumpad(item, 'quantity', item.quantity.toString());
          this.updateActiveBill({ cartItems: items });
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
          const items = [...this.cartItems()];
          items[idx] = this.counterNumpadService.updateCartItemFromNumpad(item, 'quantity', item.quantity.toString());
          this.updateActiveBill({ cartItems: items });
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

  canEditBill(): boolean {
    if (this.invoiceHeader.invoiceId() !== null) {
      const user = this.Userdetails;
      const typeId = user?.userTypeId || user?.usertypeid || user?.userTypeID || user?.userTypeId;
      if (Number(typeId) !== 1) {
        return false;
      }
    }
    return true;
  }

  numpadSearchAction = new Subject<string>();

  handleNumpadInput(val: string) {
    const idx = this.selectedItemIndex();

    // If no cart item is selected, route numpad input to the search bar
    if (idx === null || idx < 0 || idx >= this.cartItems().length) {
      let q = this.searchQuery();
      if (val === 'backspace') {
        q = q.slice(0, -1);
      } else if (val === 'clear') {
        q = '';
      } else {
        q = q + val;
      }
      this.searchQuery.set(q);
      this.numpadSearchAction.next(q);
      return;
    }

    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      return;
    }

    const item = this.cartItems()[idx];

    // Do not allow decimal point or quick weights in quantity if product mensurationType is 'Count' or mensurationUnit is 'Nos'
    if (val.startsWith('.') && this.numpadMode() === 'quantity') {
      const mensurationType = item.product?.['mensurationType'];
      const mensurationUnit = item.product?.['mensurationUnit'];
      if ((mensurationType && String(mensurationType).toLowerCase() === 'count') ||
        (mensurationUnit && String(mensurationUnit) === 'Nos')) {
        this.notificationService.showError(`Decimal values are not allowed for ${mensurationUnit || 'Count'}`);
        return;
      }
    }

    const result = this.counterNumpadService.calculateNumpadInput(
      val,
      this.numpadValue(),
      this.numpadMode(),
      this.numpadShouldReplace,
      this.numpadHasQuickWeight
    );

    this.updateActiveBill({
      numpadValue: result.nextVal,
      numpadShouldReplace: result.nextShouldReplace,
      numpadHasQuickWeight: result.nextHasQuickWeight
    });

    if (result.errorMessage) {
      this.notificationService.showError(result.errorMessage);
    }

    this.syncCartFromNumpad();
  }

  setNumpadValueExplicit(val: string) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      return;
    }
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

    const items = [...this.cartItems()];
    const item = items[idx];

    // Delegate calculation to NumpadService
    const updatedItem = this.counterNumpadService.updateCartItemFromNumpad(item, mode, valStr);

    if (mode === 'amount' && item.product?.mensurationUnit === 'Nos') {
      this.syncNumpadFromCart();
      return;
    }

    items[idx] = updatedItem;
    this.updateActiveBill({ cartItems: items });

    // Sync tax with API
    this.syncItemTaxAsync(idx, updatedItem);
  }

  private syncItemTaxAsync(idx: number, item: CartItem) {
    if (!item.quantity && !item.amount) return;

    const custStateCode = this.selectedCustomer()?.stateCode || 27;
    const orgStateCode = this.Userdetails?.stateCode || 27;
    this.taxSyncSubject.next({
      billId: this.activeBillId(),
      idx,
      item,
      custStateCode,
      orgStateCode
    });
  }

  async addToCart(product: Product) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      this.updateActiveBill({ cartItems: [...this.cartItems()] });
      return;
    }
    const cust = this.selectedCustomer();
    let finalProduct = { ...product };
    if (cust && cust.id) {
      try {
        const orgId = this.Userdetails?.organizationId || this.Userdetails?.orgId || 511;
        const materialId = finalProduct.id || finalProduct.productId || finalProduct.code || 0;
        const res = await this.counterInvoiceService.getRateList(orgId, cust.id, Number(materialId)).toPromise();
        if (res?.responseData && res.responseData.length > 0 && res.responseData[0].rate) {
          finalProduct.salePrice = res.responseData[0].rate;
          finalProduct.rate = res.responseData[0].rate;
          finalProduct.mrp = res.responseData[0].rate;
        }
      } catch (e) {
        console.error('Failed to fetch rate list', e);
      }
    }

    const items = [...this.cartItems()];
    const existingItemIndex = items.findIndex(item =>
      (item.product.id && item.product.id === finalProduct.id) ||
      (item.product.productCode && item.product.productCode === finalProduct.productCode) ||
      (item.details === (finalProduct.productName || finalProduct.materialName || finalProduct.name))
    );

    if (existingItemIndex > -1) {
      const existingItem = { ...items[existingItemIndex] };
      // Update rate just in case it changed
      existingItem.rate = finalProduct.salePrice || finalProduct.mrp || finalProduct.rate || finalProduct.price || finalProduct.saleRate || existingItem.rate;

      const nextItem = this.counterNumpadService.updateCartItemFromNumpad(
        existingItem,
        'quantity',
        (existingItem.quantity + 1).toString()
      );

      // Remove from its current position and move to the bottom
      items.splice(existingItemIndex, 1);
      items.push(nextItem);
      this.updateActiveBill({ cartItems: items });
      this.selectItem(items.length - 1);
      this.syncItemTaxAsync(items.length - 1, nextItem);
    } else {
      const rate = finalProduct.salePrice || finalProduct.mrp || finalProduct.rate || finalProduct.price || finalProduct.saleRate || 0;
      // Do not calculate tax from local DB, wait for API
      const gst = 0;
      const newItem: CartItem = {
        product: finalProduct,
        details: finalProduct.productName || finalProduct.materialName || finalProduct.name || 'Unknown Product',
        quantity: 0,
        rate: rate,
        discount: 0,
        amount: 0,
        netAmount: 0,
        gst: gst,
        gstAmount: 0,
        total: 0,
        unit: product.unit || product.uom || product.unitName || product.mensurationUnit || ''
      };

      const calculatedItem = this.counterNumpadService.updateCartItemFromNumpad(newItem, 'quantity', '0');
      items.push(calculatedItem);
      this.updateActiveBill({ cartItems: items });
      this.selectItem(items.length - 1);
      this.syncItemTaxAsync(items.length - 1, calculatedItem);
    }
  }

  updateQuantity(index: number, quantity: number) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      this.updateActiveBill({ cartItems: [...this.cartItems()] });
      return;
    }
    if (quantity < 0) {
      this.removeItem(index);
      return;
    }
    const items = [...this.cartItems()];
    const updatedItem = this.counterNumpadService.updateCartItemFromNumpad(items[index], 'quantity', quantity.toString());
    items[index] = updatedItem;
    this.updateActiveBill({ cartItems: items });
    this.syncItemTaxAsync(index, updatedItem);

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  updateAmount(index: number, amount: number) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      this.updateActiveBill({ cartItems: [...this.cartItems()] });
      return;
    }
    const items = [...this.cartItems()];
    if (items[index]?.product?.mensurationUnit === 'Nos') {
      this.syncNumpadFromCart();
      return;
    }
    const updatedItem = this.counterNumpadService.updateCartItemFromNumpad(items[index], 'amount', amount.toString());
    items[index] = updatedItem;
    this.updateActiveBill({ cartItems: items });
    this.syncItemTaxAsync(index, updatedItem);

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  updateDiscount(index: number, discount: number) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      this.updateActiveBill({ cartItems: [...this.cartItems()] });
      return;
    }
    const items = [...this.cartItems()];
    const updatedItem = this.counterNumpadService.updateCartItemFromNumpad(items[index], 'discount', discount.toString());
    items[index] = updatedItem;
    this.updateActiveBill({ cartItems: items });
    this.syncItemTaxAsync(index, updatedItem);

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  removeItem(index: number) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can edit an existing bill.');
      this.updateActiveBill({ cartItems: [...this.cartItems()] });
      return;
    }
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
    this.invoiceHeader.loadedInvoiceDate.set(null);
    this.invoiceHeader.invoiceDate.set(null);
    this.invoiceHeader.invoiceNo.set(null);
    this.invoiceHeader.invoiceId.set(null);
    this.updateActiveBill({
      cartItems: [],
      selectedCustomer: null,
      selectedItemIndex: null,
      numpadMode: 'quantity',
      numpadValue: '',
      numpadShouldReplace: false,
      numpadHasQuickWeight: false,
      loadedOrder: null
    });
  }

  resetState() {
    this.invoiceHeader.loadedInvoiceDate.set(null);
    this.invoiceHeader.invoiceDate.set(null);
    this.invoiceHeader.invoiceNo.set(null);
    this.invoiceHeader.invoiceId.set(null);
    this.bills.set([this.createEmptyBill(1)]);
    this.activeBillId.set(1);
    this.searchQuery.set('');
    this.searchType.set('product');
  }

  loadInvoiceByBillNo(billNo: string) {
    this.counterInvoiceService.loadInvoiceByBillNo(billNo).subscribe({
      next: async (res) => {
        const data = res?.data || res || {};
        const rawItems = data.invoiceDetails || data.spinvoicedetailsModel || data.details || [];
        const invoiceHeaderData = data.invoiceHeader || {};
        let invoiceDate = invoiceHeaderData.invoiceDate
          || data.invoiceDate || data.createdDate || data.showDate || data.transactionDate || null;
        if (!invoiceDate) {
          for (const key of Object.keys(invoiceHeaderData)) {
            if (key.toLowerCase().includes('date') && invoiceHeaderData[key]) {
              invoiceDate = invoiceHeaderData[key];
              break;
            }
          }
        }
        this.invoiceHeader.loadedInvoiceDate.set(invoiceDate);
        this.invoiceHeader.invoiceDate.set(invoiceDate);
        this.invoiceHeader.invoiceNo.set(invoiceHeaderData.invoiceNo || data.invoiceNo || null);
        this.invoiceHeader.invoiceId.set(invoiceHeaderData.id || data.id || null);

        const cartItems: CartItem[] = [];

        for (const item of rawItems) {
          const materialId = item.materialId || item.productId || 0;
          let product = null;
          if (materialId) {
            product = await this.dbService.products.get(materialId);
          }

          // Parse taxBreakdown from API response if available
          let dynamicTaxes: DynamicTax[] = [];
          let calculatedGstPercent = 0;
          let calculatedGstAmount = 0;

          if (item.taxBreakdown && Array.isArray(item.taxBreakdown)) {
            dynamicTaxes = item.taxBreakdown.map((tb: any) => {
              const match = tb.taxLabel ? tb.taxLabel.match(/([\d.]+)/) : null;
              const percentage = match ? parseFloat(match[1]) : 0;
              return {
                id: tb.componentId || tb.invoiceDetailId || 0,
                componentName: tb.taxLabel,
                taxAmount: parseFloat(tb.amount) || 0,
                taxPercentage: percentage
              };
            });
            calculatedGstAmount = dynamicTaxes.reduce((sum, t) => sum + (t.taxAmount || 0), 0);
            calculatedGstPercent = dynamicTaxes.reduce((sum, t) => sum + (t.taxPercentage || 0), 0);
          } else {
            // Fallback for older formats without taxBreakdown
            const cgstAmount = parseFloat(item.cgst) || 0;
            const sgstAmount = parseFloat(item.sgst) || 0;
            const igstAmount = parseFloat(item.igst) || 0;
            calculatedGstAmount = cgstAmount + sgstAmount + igstAmount;
            const baseAmount = parseFloat(item.gstonAmount) || (parseFloat(item.total) - calculatedGstAmount) || 0;

            if (calculatedGstAmount > 0 && baseAmount > 0) {
              calculatedGstPercent = Math.round(((calculatedGstAmount / baseAmount) * 100) * 10) / 10;
            }
          }

          let gst = 0;
          if (item.taxBreakdown && Array.isArray(item.taxBreakdown)) {
            gst = calculatedGstPercent;
          } else {
            gst = calculatedGstPercent || item.gst || product?.gst || product?.taxPercentage || 0;
          }

          if (!product) {
            product = {
              id: materialId,
              productName: item.materialName || item.productName || 'Unknown Product',
              salePrice: item.rate || 0,
              gst: gst
            };
          }

          const rate = parseFloat(item.rate) || product?.salePrice || 0;
          const qty = parseFloat(item.quantity) || 1;
          const discount = parseFloat(item.discount) || 0;
          const discountAmount = parseFloat(item.discountAmount) || 0;
          const totalVal = parseFloat(item.total) || 0;
          const netAmountVal = parseFloat(item.gstonAmount) || (totalVal - calculatedGstAmount) || 0;

          let amountVal = netAmountVal;
          if (discount > 0) {
            amountVal = netAmountVal / (1 - (discount / 100));
          } else if (discountAmount > 0) {
            amountVal = netAmountVal + discountAmount;
          } else {
            amountVal = netAmountVal;
          }

          // Determine if tax was included or excluded
          const baseAmountForCheck = (rate * qty) - discountAmount;
          const isTaxIncluded = Math.abs(baseAmountForCheck - totalVal) < 0.5;

          const newItem: CartItem = {
            product: product,
            details: product.productName || product.materialName || product.name || 'Unknown Product',
            quantity: qty,
            rate: rate,
            discount: discount,
            discountRupee: discountAmount,
            amount: Math.round(amountVal * 100) / 100,
            netAmount: netAmountVal,
            gst: gst,
            gstAmount: calculatedGstAmount,
            total: totalVal,
            unit: product.unit || product.uom || product.unitName || product.mensurationUnit || '',
            dynamicTaxes: dynamicTaxes,
            isTaxIncluded: isTaxIncluded
          };

          cartItems.push(newItem);
        }

        const partyId = data.partyId || data.customerId || 0;
        let selectedCustomer = null;
        if (partyId) {
          selectedCustomer = await this.dbService.customerList.get(partyId);
        }

        this.updateActiveBill({
          cartItems: cartItems,
          selectedCustomer: selectedCustomer,
          selectedItemIndex: cartItems.length > 0 ? 0 : null,
          numpadMode: 'quantity',
          numpadValue: cartItems.length > 0 ? cartItems[0].quantity.toString() : '',
          numpadShouldReplace: true,
          numpadHasQuickWeight: false
        });

        this.notificationService.showSuccess(`Invoice #${billNo} loaded into cart.`);
      },
      error: (err) => {
        console.error('Failed to load invoice:', err);
        this.invoiceHeader.loadedInvoiceDate.set(null);
        this.invoiceHeader.invoiceDate.set(null);
        this.invoiceHeader.invoiceNo.set(null);
        this.invoiceHeader.invoiceId.set(null);
        this.notificationService.showError(`Failed to load Invoice #${billNo}`);
      }
    });
  }

  async loadOrderToCart(order: any) {
    const cartItems: CartItem[] = [];

    // 1. Fetch products from IndexedDB for each item in the order
    for (const item of order.items || []) {
      const materialId = item.materialId || item.productId || item.id || 0;
      if (materialId) {
        try {
          const product = await this.dbService.products.get(materialId);
          if (product) {
            const rate = product.salePrice || product.mrp || product.rate || product.price || product.saleRate || 0;
            const gst = product.gst || product.taxPercentage || 0;
            const qty = item.quantity || 1;

            const newItem: CartItem = {
              product: product,
              details: product.productName || product.materialName || product.name || 'Unknown Product',
              quantity: qty,
              rate: rate,
              discount: 0,
              amount: 0,
              netAmount: 0,
              gst: gst,
              gstAmount: 0,
              total: 0,
              unit: product.unit || product.uom || product.unitName || product.mensurationUnit || ''
            };

            const calculatedItem = this.counterNumpadService.updateCartItemFromNumpad(newItem, 'quantity', qty.toString());
            cartItems.push(calculatedItem);
          } else {
            // Fallback product if not in DB
            const rate = item.rate || 0;
            const qty = item.quantity || 1;
            const newItem: CartItem = {
              product: { id: materialId, productName: item.materialName || 'Unknown Product', salePrice: rate },
              details: item.materialName || 'Unknown Product',
              quantity: qty,
              rate: rate,
              discount: 0,
              amount: 0,
              netAmount: 0,
              gst: 0,
              gstAmount: 0,
              total: 0,
              unit: ''
            };
            const calculatedItem = this.counterNumpadService.updateCartItemFromNumpad(newItem, 'quantity', qty.toString());
            cartItems.push(calculatedItem);
          }
        } catch (e) {
          console.error('Error loading product for order item:', e);
        }
      }
    }

    // 2. Fetch customer from IndexedDB or match by phone
    let selectedCustomer = null;
    const partyId = order.partyId || order.customerId || 0;
    if (partyId) {
      try {
        // Direct lookup with Number since Dexie table key is typed as number
        selectedCustomer = await this.dbService.customerList.get(Number(partyId));
        if (!selectedCustomer) {
          const customers = await this.dbService.customerList.toArray();
          selectedCustomer = customers.find(c => Number(c.id) === Number(partyId) || String(c.id) === String(partyId));
        }
      } catch (e) { }
    }

    if (!selectedCustomer) {
      const mobile = order.mobileNumber || order.mobileNo || order.phone || order.mobile || order.customer?.mobileNo || '';
      if (mobile) {
        try {
          const customers = await this.dbService.customerList.toArray();
          selectedCustomer = customers.find(c => String(c.mobileNo || '').includes(mobile));
        } catch (e) { }
      }
    }

    if (selectedCustomer) {
      selectedCustomer = {
        ...selectedCustomer,
        orderId: order.orderId
      };
    }

    // 3. Update active bill state
    this.updateActiveBill({
      cartItems: cartItems,
      selectedCustomer: selectedCustomer,
      selectedItemIndex: cartItems.length > 0 ? 0 : null,
      numpadMode: 'quantity',
      numpadValue: cartItems.length > 0 ? cartItems[0].quantity.toString() : '',
      numpadShouldReplace: true,
      numpadHasQuickWeight: false,
      loadedOrder: order
    });

    if (selectedCustomer) {
      this.searchType.set('customer');
    }

    const orderId = order.orderId || order.orderNo || order.id || '—';
    this.notificationService.showSuccess(`Order #${orderId} loaded into cart.`);
  }

  async saveInvoice(paymentMode: 'cash' | 'online' | 'card', printAutomatically: boolean) {
    if (!this.canEditBill()) {
      this.notificationService.showError('Only Admin can update an existing bill.');
      return;
    }

    const invalidItems = this.cartItems().filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      this.notificationService.showError("One or more items have quantity 0. Please update the quantity or remove them before saving the bill.");
      return;
    }

    const validItems = this.cartItems().filter(item => item.quantity > 0);

    if (validItems.length === 0 || this.totalPayable() === 0) {
      this.notificationService.showError("The invoice total is ₹0. Please add a product with quantity before payment.");
      return;
    }

    const amountPaid = this.totalPayable();
    const totals = {
      subTotal: this.subTotal(),
      totalDiscount: this.totalDiscount(),
      totalGst: this.totalGst(),
      billAmount: this.billAmount(),
      roundOff: this.roundOff(),
      totalPayable: amountPaid,
      totalCgst: this.totalCgst(),
      totalSgst: this.totalSgst(),
      totalIgst: this.totalIgst()
    };

    let modeString = "Cash";
    if (paymentMode === 'online') {
      modeString = "Online";
    } else if (paymentMode === 'card') {
      const billingType = this.selectedCustomer()?.billingType?.toLowerCase();
      modeString = billingType === 'prepaid' ? "Coupon" : "Credit";
    }

    try {
      const res = await this.counterInvoiceService.saveInvoice(
        validItems,
        totals,
        this.selectedCustomer(),
        paymentMode,
        {
          invoiceId: this.invoiceHeader.invoiceId(),
          invoiceNo: this.invoiceHeader.invoiceNo(),
          invoiceDate: this.invoiceHeader.invoiceDate()
        },
        this.loadedOrder()
      );

      const invoiceData = res?.data;

      // Determine the new bill number from the response
      let newBillNo = '';
      if (invoiceData) {
        if (typeof invoiceData === 'object') {
          if (invoiceData.invoiceNo) {
            newBillNo = invoiceData.invoiceNo;
          } else if (invoiceData.data) {
            newBillNo = String(invoiceData.data);
          }
        } else {
          newBillNo = String(invoiceData);
        }
      }

      // If it's a simple ID/number, format it using the previous bill number structure if possible
      if (newBillNo && !newBillNo.includes('/')) {
        const prev = this.sessionBillStats().previousBillNo;
        if (prev && prev.includes('/')) {
          const parts = prev.split('/');
          parts[0] = newBillNo;
          newBillNo = parts.join('/');
        }
      }

      if (!newBillNo) {
        newBillNo = this.sessionBillStats().previousBillNo;
      }

      // Update session stats
      this.sessionBillStats.update(stats => ({
        bills: stats.bills + 1,
        totalAmount: stats.totalAmount + amountPaid,
        previousBillNo: newBillNo
      }));

      // Print automatically if requested and print data is available
      if (printAutomatically && invoiceData) {
        this.counterInvoiceService.printReceipt(invoiceData, this.cartItems(), totals);
      }

      this.clearCart();
      this.notificationService.showSuccess(
        `Payment of ₹${amountPaid} received via ${modeString}. Bill No: ${newBillNo}`,
        'Bill Generated Successfully!'
      );
    } catch (err: any) {
      console.error('Failed to generate bill:', err);
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Failed to generate bill');
      this.notificationService.showError(errorMessage);
    }
  }
}
