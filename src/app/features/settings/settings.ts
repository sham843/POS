import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DbService } from '../../core/services/db.service';

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
    MatIconModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings implements OnInit {
  dialogRef = inject(MatDialogRef<Settings>);
  dbService = inject(DbService);

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
    
    // Set default or previously selected values if they exist in localStorage
    const savedDiscountType = localStorage.getItem('discountType');
    if (savedDiscountType) {
      this.discountType = savedDiscountType;
    }
  }

  save() {
    localStorage.setItem('discountType', this.discountType);
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
