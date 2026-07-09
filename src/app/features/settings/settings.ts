import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, X, Settings as SettingsIcon, Save as SaveIcon } from 'lucide-angular';
import { DbService } from '../../core/services/db.service';
import { ApiService } from '../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    LucideAngularModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings implements OnInit {
  dialogRef = inject(MatDialogRef<Settings>);
  dbService = inject(DbService);
  apiService = inject(ApiService);
  cdr = inject(ChangeDetectorRef);
  
  readonly X = X;
  readonly SettingsIcon = SettingsIcon;
  readonly SaveIcon = SaveIcon;
  companyLedgerList: any[] = [];
  saleLedgerList: any[] = [];
  cashlist: any[] = [];
  godownlist: any[] = []; // Mocked for now until API is available

  selectedCompanyLedger: any;
  selectedSaleLedger: any;
  selectedCashAccount: any;
  selectedGodown: any;
  discountType: string = 'percent';

  async ngOnInit() {
    // Load lists from IndexedDB
    this.companyLedgerList = await this.dbService.companyLedgerList.toArray();
    this.saleLedgerList = await this.dbService.saleLedgerList.toArray();
    this.cashlist = await this.dbService.cashLedger.toArray();
    
    // Auto-select if there is exactly 1 item
    if (this.companyLedgerList.length === 1) {
      this.selectedCompanyLedger = this.companyLedgerList[0];
    }
    if (this.saleLedgerList.length === 1) {
      this.selectedSaleLedger = this.saleLedgerList[0];
    }
    if (this.cashlist.length === 1) {
      this.selectedCashAccount = this.cashlist[0];
    }

    // Set default or previously selected values if they exist in localStorage
    const savedDiscountType = localStorage.getItem('discountType');
    if (savedDiscountType) {
      this.discountType = savedDiscountType;
    }

    try {
      let unitId = '578';
      const userStr = localStorage.getItem('UserDetails');
      if (userStr) {
        const userDetails = JSON.parse(userStr);
        if (userDetails.unitid) unitId = userDetails.unitid;
      }
      const godownRes = await firstValueFrom(this.apiService.get<any>(`api/v1/customer/godown-list?unitId=${unitId}`));
      this.godownlist = Array.isArray(godownRes) ? godownRes : (godownRes?.data || []);
      
      const savedGodownStr = localStorage.getItem('selectedGodown');
      let foundGodown = null;
      if (savedGodownStr) {
        try {
          const parsed = JSON.parse(savedGodownStr);
          foundGodown = this.godownlist.find(g => g.stockYardId === parsed.stockYardId || g.stockYardName === parsed.stockYardName);
        } catch (e) {}
      }

      if (foundGodown) {
        this.selectedGodown = foundGodown;
      } else if (this.godownlist.length > 0) {
        this.selectedGodown = this.godownlist[0];
      }
    } catch (e) {
      console.error('Failed to load godown list', e);
    }
    this.cdr.markForCheck();
  }

  save() {
    localStorage.setItem('discountType', this.discountType);
    if (this.selectedGodown) {
      localStorage.setItem('selectedGodown', JSON.stringify(this.selectedGodown));
    }
    this.dialogRef.close({
      companyLedger: this.selectedCompanyLedger,
      saleLedger: this.selectedSaleLedger,
      cashaccount: this.selectedCashAccount,
      godown: this.selectedGodown,
      discountType: this.discountType
    });
  }

  close() {
    this.dialogRef.close();
  }
}
