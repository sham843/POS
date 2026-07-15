import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { BankAccount } from '../models/bank-account.model';
import { CashLedger } from '../models/cash-ledger.model';
import { CompanyLedger } from '../models/company-ledger.model';
import { Customer } from '../models/customer.model';
import { SaleLedger } from '../models/sale-ledger.model';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  // Declare tables here
  bankAccounts!: Table<BankAccount, number>;
  cashLedger!: Table<CashLedger, number>;
  companyLedgerList!: Table<CompanyLedger, number>;
  customerList!: Table<Customer, number>;
  saleLedgerList!: Table<SaleLedger, number>;
  products!: Table<Product, number>;
  categories!: Table<Category, number>;

  constructor() {
    super('POSDatabase');

    // Define schema
    this.version(2).stores({
      bankAccounts: 'id', // Assuming 'id' is the primary key
      cashLedger: 'id',
      companyLedgerList: 'id',
      customerList: 'id',
      saleLedgerList: 'id',
      products: 'id, productId, categoryName, materialGroupName', // Indexed for fast category filtering
      categories: 'id' // Was products
    });
  }

  async clearAllData() {
    try {
      await Promise.all(this.tables.map(table => table.clear()));
      console.log('IndexedDB cleared successfully');
    } catch (e) {
      console.error('Failed to clear IndexedDB tables:', e);
    }
  }
}
