import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const noAuthGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Check if user is already logged in
  const userDetails = localStorage.getItem('UserDetails');

  if (userDetails) {
    // If logged in, redirect them away from login/home page
    // You can change this to redirect to wherever a logged in user should go
    router.navigate(['/session-start']);
    return false;
  }

  // If not logged in, allow access to the route (like login page)
  return true;
};
