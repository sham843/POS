import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const cookieInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let clonedReq = req;

  if (token) {
    // We use withCredentials to pass native browser cookies
    // If the token is a JWT, we pass it via the Authorization header (standard)
    clonedReq = req.clone({
      withCredentials: true,
      setHeaders: {
        'Authorization': `Bearer ${token}`,
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
