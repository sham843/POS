import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { LucideAngularModule, Check, AlertCircle, X } from 'lucide-angular';

@Component({
  selector: 'app-custom-snackbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './custom-snackbar.html',
  styleUrl: './custom-snackbar.scss',
})
export class CustomSnackbar {
  readonly Check = Check;
  readonly AlertCircle = AlertCircle;
  readonly X = X;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: { title: string; message: string; type: 'success' | 'error' },
    public snackBarRef: MatSnackBarRef<CustomSnackbar>
  ) {}
}
