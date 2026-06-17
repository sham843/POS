import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

export interface CartItem {
  product: any;
  details: string;
  quantity: number;
  rate: number;
  discount: number;
  amount: number;
  gst: number;
  gstAmount: number;
  total: number;
  unit?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CounterSaleService {
  notificationService = inject(NotificationService);
  searchQuery = signal<string>('');
  searchType = signal<'product' | 'bill' | 'customer'>('product');

  cartItems = signal<CartItem[]>([]);
  selectedItemIndex = signal<number | null>(null);
  numpadMode = signal<'quantity' | 'amount' | 'discount'>('quantity');
  numpadValue = signal<string>('');
  numpadShouldReplace = false;
  numpadHasQuickWeight = false;

  // Computed totals for bill summary
  subTotal = computed(() => this.cartItems().reduce((acc, item) => acc + item.amount, 0));
  totalDiscount = computed(() => this.cartItems().reduce((acc, item) => acc + (item.amount * item.discount / 100), 0));
  taxableAmount = computed(() => this.subTotal() - this.totalDiscount());
  totalGst = computed(() => this.cartItems().reduce((acc, item) => acc + item.gstAmount, 0));
  billAmount = computed(() => this.taxableAmount() + this.totalGst());
  roundOff = computed(() => Math.round(this.billAmount()) - this.billAmount());
  totalPayable = computed(() => Math.round(this.billAmount()));

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
    });
  }

  updateSearchQuery(query: string) {
    this.searchSubject.next(query);
  }

  selectItem(index: number | null) {
    if (this.selectedItemIndex() !== null) {
      const oldIdx = this.selectedItemIndex()!;
      if (oldIdx < this.cartItems().length) {
        const item = this.cartItems()[oldIdx];
        if (this.numpadMode() === 'amount' && item.amount <= 0) {
          this.notificationService.showError(`Amount cannot be zero.`);
          // Revert amount to rate * quantity as a fallback
          item.amount = item.rate * item.quantity;
          const discountedAmount = item.amount - (item.amount * item.discount / 100);
          item.gstAmount = discountedAmount * item.gst / 100;
          item.total = discountedAmount + item.gstAmount;
        }
      }
    }

    if (this.selectedItemIndex() !== index) {
      this.numpadShouldReplace = true;
      this.numpadHasQuickWeight = false;
    }
    this.selectedItemIndex.set(index);
    this.syncNumpadFromCart();
  }

  setNumpadMode(mode: 'quantity' | 'amount' | 'discount') {
    if (this.selectedItemIndex() !== null && this.numpadMode() === 'amount' && mode !== 'amount') {
      const idx = this.selectedItemIndex()!;
      if (idx < this.cartItems().length) {
        const item = this.cartItems()[idx];
        if (item.amount <= 0) {
          this.notificationService.showError(`Amount cannot be zero.`);
          item.amount = item.rate * item.quantity;
          const discountedAmount = item.amount - (item.amount * item.discount / 100);
          item.gstAmount = discountedAmount * item.gst / 100;
          item.total = discountedAmount + item.gstAmount;
        }
      }
    }

    this.numpadMode.set(mode);
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
        this.numpadValue.set(item.quantity.toString());
      } else if (mode === 'amount') {
        this.numpadValue.set(item.amount.toString());
      } else if (mode === 'discount') {
        this.numpadValue.set(item.discount === 0 ? '' : item.discount.toString());
      }
    } else {
      this.numpadValue.set('');
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

    this.numpadValue.set(currentVal);
    this.syncCartFromNumpad();
  }

  setNumpadValueExplicit(val: string) {
    const idx = this.selectedItemIndex();
    if (idx === null || idx < 0 || idx >= this.cartItems().length) return;
    this.numpadValue.set(val);
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
      item.amount = item.rate * item.quantity;
    } else if (mode === 'amount') {
      if (item.product?.mensurationUnit === 'Nos') {
        this.syncNumpadFromCart();
        return;
      }
      item.amount = valNum;
      if (item.rate > 0) {
        item.quantity = Math.round((item.amount / item.rate) * 1000) / 1000;
      }
    } else if (mode === 'discount') {
      item.discount = valNum;
    }

    const discountedAmount = item.amount - (item.amount * item.discount / 100);
    item.gstAmount = discountedAmount * item.gst / 100;
    item.total = discountedAmount + item.gstAmount;

    this.cartItems.set(items);
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
      const amount = rate * 1;
      const gstAmount = amount * gst / 100;
      const newItem: CartItem = {
        product: product,
        details: product.productName || product.materialName || product.name || 'Unknown Product',
        quantity: 1,
        rate: rate,
        discount: 0,
        amount: amount,
        gst: gst,
        gstAmount: gstAmount,
        total: amount + gstAmount,
        unit: product.unit || product.uom || product.unitName || ''
      };
      items.push(newItem);
      this.cartItems.set(items);
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
    item.amount = item.rate * item.quantity;
    const discountedAmount = item.amount - (item.amount * item.discount / 100);
    item.gstAmount = discountedAmount * item.gst / 100;
    item.total = discountedAmount + item.gstAmount;
    this.cartItems.set(items);

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
    item.amount = amount;
    if (item.rate > 0) {
      item.quantity = Math.round((item.amount / item.rate) * 1000) / 1000;
    }
    const discountedAmount = item.amount - (item.amount * item.discount / 100);
    item.gstAmount = discountedAmount * item.gst / 100;
    item.total = discountedAmount + item.gstAmount;
    this.cartItems.set(items);

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  updateDiscount(index: number, discount: number) {
    const items = [...this.cartItems()];
    const item = items[index];
    item.discount = discount || 0;
    const discountedAmount = item.amount - (item.amount * item.discount / 100);
    item.gstAmount = discountedAmount * item.gst / 100;
    item.total = discountedAmount + item.gstAmount;
    this.cartItems.set(items);

    if (this.selectedItemIndex() === index) {
      this.syncNumpadFromCart();
    }
  }

  removeItem(index: number) {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.cartItems.set(items);

    if (this.selectedItemIndex() === index) {
      this.selectItem(items.length > 0 ? items.length - 1 : null);
    } else if (this.selectedItemIndex() !== null && this.selectedItemIndex()! > index) {
      this.selectedItemIndex.set(this.selectedItemIndex()! - 1);
    }
  }

  clearCart() {
    this.cartItems.set([]);
    this.selectItem(null);
  }
}
