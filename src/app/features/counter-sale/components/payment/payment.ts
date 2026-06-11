import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment {}
