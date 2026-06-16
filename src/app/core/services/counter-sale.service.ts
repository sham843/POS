import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CounterSaleService {
  searchQuery = signal<string>('');
  searchType = signal<'product' | 'bill' | 'customer'>('product');

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
}
