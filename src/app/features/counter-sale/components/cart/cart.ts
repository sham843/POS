import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { LucideAngularModule, Trash2, Package, Minus, Plus } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    MatTabsModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    EmptyState
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  displayedColumns: string[] = ['details', 'quantity', 'rate', 'discount', 'amount', 'gst', 'total'];
  
  // Data source for the table (default is empty)
  dataSource = signal<any[]>([]);

  // Expose icons to template
  readonly Trash2 = Trash2;
  readonly Package = Package;
  readonly Minus = Minus;
  readonly Plus = Plus;
}
