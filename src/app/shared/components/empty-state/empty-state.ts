import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  ShoppingCart,
  Package,
  Search,
  Inbox,
  AlertCircle,
} from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input<string>('No Data Found');
  @Input() message: string = 'There is no data available to display.';
  readonly icon = input<'product' | 'cart' | 'search' | 'inbox' | 'alert'>('inbox');

  get iconImage() {
    switch (this.icon()) {
      case 'product':
        return Package;
      case 'cart':
        return ShoppingCart;
      case 'search':
        return Search;
      case 'alert':
        return AlertCircle;
      case 'inbox':
      default:
        return Inbox;
    }
  }
}
