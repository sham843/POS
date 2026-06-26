import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, TimeoutError } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoaderService } from '../services/loader.service';
import { NotificationService } from '../services/notification.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  const skipLoader = req.headers.has('X-Skip-Loader');
  const customFallbackError = req.headers.get('X-Custom-Error');
  
  // Remove the custom header so it doesn't go to the server
  let modifiedReq = req;
  if (skipLoader || customFallbackError) {
    modifiedReq = req.clone({ headers: req.headers.delete('X-Skip-Loader').delete('X-Custom-Error') });
  }

  // Show loader on request start for non-GET requests unless skipped
  if (req.method !== 'GET' && !skipLoader) {
    loaderService.show();
  }

  return next(modifiedReq).pipe(
    // 30 seconds timeout
    timeout(30000),
    catchError((error: any) => {
      let errorMsg = 'An unknown error occurred!';

      if (error instanceof TimeoutError) {
        errorMsg = 'Request timed out. Please try again.';
      } else if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          errorMsg = 'Session expired or unauthorized. Please log in again.';
          localStorage.removeItem('auth_token');
          localStorage.removeItem('tk_9xf1BzX');
          localStorage.removeItem('UserDetails');
          localStorage.removeItem('sessionId');
          router.navigate(['/login']);
        } else if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (customFallbackError) {
          errorMsg = customFallbackError;
        } else {
          switch (error.status) {
            case 400:
              errorMsg = 'Bad Request. Please check the data you entered.';
              break;
            case 403:
              errorMsg = 'Forbidden. You do not have permission to perform this action.';
              break;
            case 404:
              errorMsg = 'The requested resource was not found.';
              break;
            case 405:
              errorMsg = 'Method Not Allowed. This action is not supported by the server.';
              break;
            case 500:
              errorMsg = 'Internal Server Error. Please try again later.';
              break;
            case 502:
            case 503:
            case 504:
              errorMsg = 'Service unavailable. The server is temporarily unable to service your request.';
              break;
            case 0:
              errorMsg = 'Unable to connect to the server. Please check your internet connection.';
              break;
            default:
              errorMsg = `Server error: ${error.status} ${error.statusText}`;
              break;
          }
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      // Show global error notification
      notificationService.showError(errorMsg);

      return throwError(() => new Error(errorMsg));
    }),
    finalize(() => {
      // Hide loader when request completes (success or error)
      if (req.method !== 'GET' && !skipLoader) {
        loaderService.hide();
      }
    })
  );
};
