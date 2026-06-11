import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment {}
