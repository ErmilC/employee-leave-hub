import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const user = authService.getUser();

  let modifiedReq = req;

  if (user && user.token) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${user.token}`,
        'X-User-Id': user.emplId.toString(),
        'X-User-Role': user.role,
        'X-User-Email': user.email
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - session expired or invalid
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
