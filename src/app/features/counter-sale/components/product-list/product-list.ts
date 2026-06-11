import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {}
