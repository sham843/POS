import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const cookieInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let clonedReq = req;

  if (token) {
    // Set the .AspNetCore.Session cookie explicitly via header
    // and enable withCredentials to pass native browser cookies
    clonedReq = req.clone({
      withCredentials: true,
      setHeaders: {
        'Cookie': `.AspNetCore.Session=${token}`,
        'Content-Type': 'application/json'
      }
    });
  } else {
    clonedReq = req.clone({
      withCredentials: true,
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  return next(clonedReq);
};
