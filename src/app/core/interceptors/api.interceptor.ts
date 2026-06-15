import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, TimeoutError } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';
// import { LoaderService } from '../services/loader.service';
import { NotificationService } from '../services/notification.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // const loaderService = inject(LoaderService);
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  // Show loader on request start
  // loaderService.show();

  return next(req).pipe(
    // 30 seconds timeout
    timeout(30000),
    catchError((error: any) => {
      let errorMsg = 'An unknown error occurred!';

      if (error instanceof TimeoutError) {
        errorMsg = 'Request timed out. Please try again.';
      } else if (error instanceof HttpErrorResponse) {
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else {
          switch (error.status) {
            case 400:
              errorMsg = 'Bad Request. Please check the data you entered.';
              break;
            case 401:
              errorMsg = 'Session expired or unauthorized. Please log in again.';
              localStorage.removeItem('auth_token');
              localStorage.removeItem('tk_9xf1BzX');
              localStorage.removeItem('UserDetails');
              router.navigate(['/login']);
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

      return throwError(() => error);
    }),
    finalize(() => {
      // Hide loader when request completes (success or error)
      //loaderService.hide();
    })
  );
};
