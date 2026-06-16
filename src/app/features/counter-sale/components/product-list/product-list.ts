import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule, LayoutGrid, Package, Ellipsis, Star, ChevronLeft, ChevronRight } from 'lucide-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  // Expose icons to template
  readonly LayoutGrid = LayoutGrid;
  readonly Package = Package;
  readonly Ellipsis = Ellipsis;
  readonly Star = Star;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  // Dynamic Categories (Mock data from backend)
  categories = [
    { name: 'Milk' },
    { name: 'Paneer' },
    { name: 'Ghee' },
    { name: 'Khava' },
    { name: 'Lassi' }
  ];
  
  activeCategory = 'All';
  
  selectCategory(name: string) {
    this.activeCategory = name;
  }
}
