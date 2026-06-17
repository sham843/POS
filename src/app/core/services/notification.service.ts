import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { CustomSnackbar } from '../../shared/components/custom-snackbar/custom-snackbar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private activeSnackBarRef: MatSnackBarRef<CustomSnackbar> | null = null;
  private currentNotification: { title: string; message: string; type: 'success' | 'error' } | null = null;

  showSuccess(message: string, title: string = 'Success'): void {
    if (
      this.currentNotification &&
      this.currentNotification.type === 'success' &&
      this.currentNotification.message === message &&
      this.currentNotification.title === title
    ) {
      return; // Already showing this identical alert
    }

    this.currentNotification = { title, message, type: 'success' };

    if (this.activeSnackBarRef) {
      const ref = this.activeSnackBarRef;
      ref.afterDismissed().subscribe(() => {
        // Only open the new one if the latest requested notification is still this one
        if (
          this.currentNotification &&
          this.currentNotification.type === 'success' &&
          this.currentNotification.message === message &&
          this.currentNotification.title === title
        ) {
          this.executeOpenSuccess(message, title);
        }
      });
      ref.dismiss();
      this.activeSnackBarRef = null;
    } else {
      this.executeOpenSuccess(message, title);
    }
  }

  showError(message: string, title: string = 'Error'): void {
    if (
      this.currentNotification &&
      this.currentNotification.type === 'error' &&
      this.currentNotification.message === message &&
      this.currentNotification.title === title
    ) {
      return; // Already showing this identical alert
    }

    this.currentNotification = { title, message, type: 'error' };

    if (this.activeSnackBarRef) {
      const ref = this.activeSnackBarRef;
      ref.afterDismissed().subscribe(() => {
        // Only open the new one if the latest requested notification is still this one
        if (
          this.currentNotification &&
          this.currentNotification.type === 'error' &&
          this.currentNotification.message === message &&
          this.currentNotification.title === title
        ) {
          this.executeOpenError(message, title);
        }
      });
      ref.dismiss();
      this.activeSnackBarRef = null;
    } else {
      this.executeOpenError(message, title);
    }
  }

  private executeOpenSuccess(message: string, title: string): void {
    this.activeSnackBarRef = this.snackBar.openFromComponent(CustomSnackbar, {
      data: { title, message, type: 'success' },
      duration: 1500,
      panelClass: ['transparent-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });

    this.activeSnackBarRef.afterDismissed().subscribe(() => {
      this.activeSnackBarRef = null;
      if (
        this.currentNotification &&
        this.currentNotification.type === 'success' &&
        this.currentNotification.message === message &&
        this.currentNotification.title === title
      ) {
        this.currentNotification = null;
      }
    });
  }

  private executeOpenError(message: string, title: string): void {
    this.activeSnackBarRef = this.snackBar.openFromComponent(CustomSnackbar, {
      data: { title, message, type: 'error' },
      duration: 2500,
      panelClass: ['transparent-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });

    this.activeSnackBarRef.afterDismissed().subscribe(() => {
      this.activeSnackBarRef = null;
      if (
        this.currentNotification &&
        this.currentNotification.type === 'error' &&
        this.currentNotification.message === message &&
        this.currentNotification.title === title
      ) {
        this.currentNotification = null;
      }
    });
  }
}
