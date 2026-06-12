import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { DbService } from './db.service';
import { forkJoin, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {

  constructor(
    private apiService: ApiService,
    private dbService: DbService
  ) { }

  /**
   * Fetches all master data from APIs and stores it in IndexedDB.
   * This is typically called on the Session Start screen.
   */
  async loadAndStoreMasterData(userData: any): Promise<void> {
    console.log(userData)
    // TODO: Replace these placeholder endpoints with the real API endpoints.
    try {
      const responses = await firstValueFrom(forkJoin({
        bankAccounts: this.apiService.get<any[]>('api/v1/master/bank-accounts'),
        cashLedger: this.apiService.get<any[]>('api/v1/master/cash-ledger'),
        companyLedgers: this.apiService.get<any[]>('api/v1/master/company-ledgers'),
        customers: this.apiService.get<any[]>('api/v1/master/customers'),
        saleLedgers: this.apiService.get<any[]>('api/v1/master/sale-ledgers'),
        variants: this.apiService.get<any[]>('api/v1/master/variants')
      }));

      // Store in Dexie
      await this.dbService.transaction('rw',
        [
          this.dbService.bankAccounts,
          this.dbService.cashLedger,
          this.dbService.companyLedgerList,
          this.dbService.customerList,
          this.dbService.saleLedgerList,
          this.dbService.variantList
        ],
        async () => {
          // Clear existing data before adding new (or you can use put for upsert if data has IDs)
          await this.dbService.bankAccounts.clear();
          await this.dbService.cashLedger.clear();
          await this.dbService.companyLedgerList.clear();
          await this.dbService.customerList.clear();
          await this.dbService.saleLedgerList.clear();
          await this.dbService.variantList.clear();

          // Add new data
          if (responses.bankAccounts?.length) await this.dbService.bankAccounts.bulkAdd(responses.bankAccounts);
          if (responses.cashLedger?.length) await this.dbService.cashLedger.bulkAdd(responses.cashLedger);
          if (responses.companyLedgers?.length) await this.dbService.companyLedgerList.bulkAdd(responses.companyLedgers);
          if (responses.customers?.length) await this.dbService.customerList.bulkAdd(responses.customers);
          if (responses.saleLedgers?.length) await this.dbService.saleLedgerList.bulkAdd(responses.saleLedgers);
          if (responses.variants?.length) await this.dbService.variantList.bulkAdd(responses.variants);
        });

      console.log('All master data successfully loaded into IndexedDB.');
    } catch (error) {
      console.error('Failed to load master data into IndexedDB:', error);
      throw error;
    }
  }
}
