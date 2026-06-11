import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  displayedColumns: string[] = ['details', 'quantity', 'rate', 'discount', 'amount', 'gst', 'total'];
  
  // Dummy data source for the table
  dataSource = [
    { details: 'Fresh Milk 1L', quantity: 1, rate: 65.00, discount: 0.00, amount: 65.00, gst: '0%', total: 65.00 },
    { details: 'Paneer 200g', quantity: 2, rate: 90.00, discount: 0.00, amount: 180.00, gst: '0%', total: 180.00 },
  ];
}
