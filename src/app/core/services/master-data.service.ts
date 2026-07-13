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
  async loadAndStoreMasterData(): Promise<void> {
    try {
      // Get user details from localStorage to build the query string
      let organizationId = '';
      let unitId = '';
      const userStr = localStorage.getItem('UserDetails');
      if (userStr) {
        try {
          const userDetails = JSON.parse(userStr);
          organizationId = userDetails.organizationId || '';
          unitId = userDetails.unitid || '';
        } catch (e) {
          console.error('Failed to parse UserDetails in MasterDataService', e);
        }
      }

      const queryString = `?organizationId=${organizationId}&unitId=${unitId}`;

      const responses = await firstValueFrom(forkJoin({
        bankAccounts: this.apiService.get<any>(`api/v1/customer/bank-account${queryString}`),
        cashLedger: this.apiService.get<any>(`api/v1/customer/cash-ledger${queryString}`),
        companyLedgers: this.apiService.get<any>(`api/v1/customer/company-ledger${queryString}`),
        customers: this.apiService.get<any>(`api/v1/customer/customers?organizationId=${organizationId}`),
        saleLedgers: this.apiService.get<any>(`api/v1/customer/sale-ledger${queryString}`),
        variants: this.apiService.get<any>(`api/v1/product/variants${queryString}`),
        products: this.apiService.get<any>(`api/v1/product/product${queryString}`)
      }));


      // Store in Dexie
      await this.dbService.transaction('rw',
        [
          this.dbService.bankAccounts,
          this.dbService.cashLedger,
          this.dbService.companyLedgerList,
          this.dbService.customerList,
          this.dbService.saleLedgerList,
          this.dbService.products,
          this.dbService.categories
        ],
        async () => {
          // Clear existing data before adding new (or you can use put for upsert if data has IDs)
          await this.dbService.bankAccounts.clear();
          await this.dbService.cashLedger.clear();
          await this.dbService.companyLedgerList.clear();
          await this.dbService.customerList.clear();
          await this.dbService.saleLedgerList.clear();
          await this.dbService.products.clear();
          await this.dbService.categories.clear();
          // Add new data
          if (responses.bankAccounts?.data?.length) await this.dbService.bankAccounts.bulkAdd(responses.bankAccounts.data);
          if (responses.cashLedger?.data?.length) await this.dbService.cashLedger.bulkAdd(responses.cashLedger.data);
          if (responses.companyLedgers?.data?.length) await this.dbService.companyLedgerList.bulkAdd(responses.companyLedgers.data);
          if (responses.customers?.data?.length) await this.dbService.customerList.bulkAdd(responses.customers.data);
          if (responses.saleLedgers?.data?.length) await this.dbService.saleLedgerList.bulkAdd(responses.saleLedgers.data);
          if (responses.variants?.data?.length) await this.dbService.products.bulkAdd(responses.variants.data);
          if (responses.products?.data?.length) await this.dbService.categories.bulkAdd(responses.products.data);
        });

      localStorage.setItem('lastSyncedTime', new Date().toISOString());
      console.log('All master data successfully loaded into IndexedDB.');
    } catch (error) {
      console.error('Failed to load master data into IndexedDB:', error);
      throw error;
    }
  }
}
