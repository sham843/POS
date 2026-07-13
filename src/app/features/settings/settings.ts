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

  selectedCompanyLedger: any;
  selectedSaleLedger: any;
  selectedCashAccount: any;

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

    if (savedSettings?.companyLedger?.id) {
      this.selectedCompanyLedger = this.companyLedgerList.find(x => x.id == savedSettings.companyLedger.id) || null;
    }

    if (savedSettings?.saleLedger?.id) {
      this.selectedSaleLedger = this.saleLedgerList.find(x => x.id == savedSettings.saleLedger.id) || null;
    }

    if (savedSettings?.cashAccount?.id) {
      this.selectedCashAccount = this.cashlist.find(x => x.id == savedSettings.cashAccount.id) || null;
    }

    this.cdr.markForCheck();
  }

  save() {
    let obj = {
      companyLedger: this.selectedCompanyLedger ? { id: this.selectedCompanyLedger.id, name: this.selectedCompanyLedger.customerName } : null,
      saleLedger: this.selectedSaleLedger ? { id: this.selectedSaleLedger.id, name: this.selectedSaleLedger.customerName } : null,
      cashAccount: this.selectedCashAccount ? { id: this.selectedCashAccount.id, name: this.selectedCashAccount.bankName || this.selectedCashAccount.customerName } : null
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
