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
  discountType: string = '';

  async ngOnInit() {
    // Load lists from IndexedDB
    this.companyLedgerList = await this.dbService.companyLedgerList.toArray();
    this.saleLedgerList = await this.dbService.saleLedgerList.toArray();
    this.cashlist = await this.dbService.bankAccounts.toArray();

    const savedSettingsStr = localStorage.getItem('posSettings');
    let savedSettings: any = null;
    if (savedSettingsStr) {
      try {
        savedSettings = JSON.parse(savedSettingsStr);
      } catch (e) { }
    }

    if (savedSettings?.discountType) {
      this.discountType = savedSettings.discountType;
    }

    if (savedSettings?.companyLedger?.id) {
      this.selectedCompanyLedger = this.companyLedgerList.find(x => x.id == savedSettings.companyLedger.id) || null;
    }

    if (savedSettings?.saleLedger?.id) {
      this.selectedSaleLedger = this.saleLedgerList.find(x => x.id == savedSettings.saleLedger.id) || null;
    }

    if (savedSettings?.cashAccount?.id) {
      this.selectedCashAccount = this.cashlist.find(x => x.id == savedSettings.cashAccount.id) || null;
    }

    try {
      let unitId: any = 0;
      const userStr = localStorage.getItem('UserDetails');
      if (userStr) {
        const userDetails = JSON.parse(userStr);
        if (userDetails.unitid) unitId = userDetails.unitid;
      }
      const godownRes = await firstValueFrom(this.apiService.get<any>(`api/v1/customer/godown-list?unitId=${unitId}`));
      this.godownlist = Array.isArray(godownRes) ? godownRes : (godownRes?.data || []);

      if (savedSettings?.godown?.id) {
        this.selectedGodown = this.godownlist.find((g: any) => g.id == savedSettings.godown.id) || null;
      }

    } catch (e) {
      console.error('Failed to load godown list', e);
    }
    this.cdr.markForCheck();
  }

  save() {
    let obj = {
      companyLedger: this.selectedCompanyLedger ? { id: this.selectedCompanyLedger.id, name: this.selectedCompanyLedger.customerName } : null,
      saleLedger: this.selectedSaleLedger ? { id: this.selectedSaleLedger.id, name: this.selectedSaleLedger.customerName } : null,
      cashAccount: this.selectedCashAccount ? { id: this.selectedCashAccount.id, name: this.selectedCashAccount.bankName || this.selectedCashAccount.customerName } : null,
      godown: this.selectedGodown || null,
      discountType: this.discountType
    };

    localStorage.setItem('posSettings', JSON.stringify(obj));
    this.dialogRef.close(obj);
  }

  compareById(f1: any, f2: any): boolean {
    return f1 && f2 && f1.id == f2.id;
  }

  close() {
    this.dialogRef.close();
  }
}
