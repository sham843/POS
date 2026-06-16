import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, Delete, Banknote, ScanBarcode, CreditCard, FileText } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    MatButtonModule
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment {
  // Expose icons to template
  readonly Delete = Delete;
  readonly Banknote = Banknote;
  readonly ScanBarcode = ScanBarcode;
  readonly CreditCard = CreditCard;
  readonly FileText = FileText;
}
