import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-bill-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bill-summary.html',
  styleUrl: './bill-summary.scss',
})
export class BillSummary { }
