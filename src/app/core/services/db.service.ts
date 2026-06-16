import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  // Declare tables here
  bankAccounts!: Table<any, number>;
  cashLedger!: Table<any, number>;
  companyLedgerList!: Table<any, number>;
  customerList!: Table<any, number>;
  saleLedgerList!: Table<any, number>;
  products!: Table<any, number>;
  categories!: Table<any, number>;

  constructor() {
    super('POSDatabase');
    
    // Define schema
    this.version(1).stores({
      bankAccounts: 'id', // Assuming 'id' is the primary key
      cashLedger: 'id',
      companyLedgerList: 'id',
      customerList: 'id',
      saleLedgerList: 'id',
      products: 'id, productId', // Indexing by id and productId (was variantList)
      categories: 'id' // Was products
    });
  }
}
