import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-bill-summary',
  standalone: true,
  imports: [CommonModule, MatListModule],
  templateUrl: './bill-summary.html',
  styleUrl: './bill-summary.scss',
})
export class BillSummary { }
