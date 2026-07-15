import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

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
  @Input() show = false;
  @Input() version = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  readonly RefreshCw = RefreshCw;

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
