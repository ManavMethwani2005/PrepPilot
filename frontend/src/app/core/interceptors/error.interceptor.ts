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
        friendlyMessage = 'Unable to connect to the PrepPilot server. Please check your network connection.';
      } else if (error.status === 401) {
        friendlyMessage = 'Your session has expired. Please sign in again.';
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 429) {
        friendlyMessage = 'You are making requests a bit too fast. Please wait a moment before trying again.';
      } else if (error.status === 500) {
        friendlyMessage = 'Something went wrong on our end. Please try again in a few moments.';
      } else if (error.error?.message) {
        friendlyMessage = error.error.message;
      }

      const modifiedError = {
        ...error,
        userMessage: friendlyMessage,
      };

      return throwError(() => modifiedError);
    })
  );
};
