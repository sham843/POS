import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
}

@Injectable({
  providedIn: 'root'
})
export class CounterSaleService {
  searchQuery = signal<string>('');
  searchType = signal<'product' | 'bill' | 'customer'>('product');

  cartItems = signal<CartItem[]>([]);

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

  addToCart(product: any) {
    const items = [...this.cartItems()];
    const existingItemIndex = items.findIndex(item => 
      (item.product.id && item.product.id === product.id) || 
      (item.product.productCode && item.product.productCode === product.productCode) ||
      (item.details === (product.productName || product.materialName || product.name))
    );

    if (existingItemIndex > -1) {
      this.updateQuantity(existingItemIndex, items[existingItemIndex].quantity + 1);
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
        total: amount + gstAmount
      };
      items.push(newItem);
      this.cartItems.set(items);
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
  }

  updateDiscount(index: number, discount: number) {
    const items = [...this.cartItems()];
    const item = items[index];
    item.discount = discount || 0;
    const discountedAmount = item.amount - (item.amount * item.discount / 100);
    item.gstAmount = discountedAmount * item.gst / 100;
    item.total = discountedAmount + item.gstAmount;
    this.cartItems.set(items);
  }

  removeItem(index: number) {
    const items = [...this.cartItems()];
    items.splice(index, 1);
    this.cartItems.set(items);
  }

  clearCart() {
    this.cartItems.set([]);
  }
}
