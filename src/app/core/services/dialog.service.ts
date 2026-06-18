import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialog = inject(MatDialog);

  openConfirmDialog(data: ConfirmDialogData) {
    return this.dialog.open(ConfirmDialog, {
      data,
      panelClass: 'confirm-dialog-panel',
      width: '320px',
      disableClose: true
    }).afterClosed();
  }
}
