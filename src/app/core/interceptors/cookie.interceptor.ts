import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Intercepts HTTP requests to inject the Bearer authentication token.
 * It strictly ignores authentication endpoints to prevent CORS preflight issues.
 */
export const cookieInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip adding the Authorization token for handshaking and login to avoid CORS rejection
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  // Inject Bearer token if it exists in local storage
  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return next(clonedReq);
  }

  // If no token, just set Content-Type
  const defaultReq = req.clone({
    setHeaders: {
      'Content-Type': 'application/json'
    }
  });
  return next(defaultReq);
};
