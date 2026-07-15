import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { LucideAngularModule, RefreshCw } from 'lucide-angular';

@Component({
  selector: 'app-update-confirm-modal',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './update-confirm-modal.html',
  styleUrl: './update-confirm-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateConfirmModalComponent {
  readonly show = input(false);
  readonly version = input('');
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  readonly RefreshCw = RefreshCw;

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
