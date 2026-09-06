import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let friendlyMessage = 'An unexpected error occurred. Please try again.';

      if (error.status === 0) {
        friendlyMessage = 'Unable to connect to the server. Please try again.';
      } else if (error.status === 401) {
        const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
        if (isAuthEndpoint) {
          friendlyMessage = error.error?.message || 'Invalid email or password.';
        } else {
          friendlyMessage = 'Your session has expired. Please sign in again.';
          authService.logout();
          router.navigate(['/login']);
        }
      } else if (error.status === 429) {
        friendlyMessage = 'You are making requests a bit too fast. Please wait a moment before trying again.';
      } else if (error.status >= 500) {
        friendlyMessage = 'Unable to connect to the server. Please try again.';
      } else if (error.error?.message) {
        friendlyMessage = error.error.message;
      }

      (error as any).userMessage = friendlyMessage;

      return throwError(() => error);
    })
  );
};
