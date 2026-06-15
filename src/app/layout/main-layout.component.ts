import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  router = inject(Router);
  currentTime = signal(new Date());
  showProfileMenu = signal(false);
  private timerInterval: any;

  ngOnInit() {
    this.timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000); // Update every second
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  toggleProfileMenu() {
    this.showProfileMenu.update(val => !val);
  }

  endSession() {
    this.showProfileMenu.set(false);
    this.router.navigate(['/session-end']);
  }
}
