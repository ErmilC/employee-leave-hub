import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard for routes requiring any authenticated user (USER, DEPT_RESP, ADMIN)
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard for routes requiring Manager (DEPT_RESP) or Administrator (ADMIN)
 */
export const managerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.getUser();
  if (user && (user.role === 'DEPT_RESP' || user.role === 'ADMIN')) {
    return true;
  }

  // If standard USER, redirect to employee personal dashboard
  router.navigate(['/employee']);
  return false;
};

/**
 * Guard for routes requiring Administrator role (ADMIN) only
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.getUser();
  if (user && user.role === 'ADMIN') {
    return true;
  }

  // If not admin, redirect according to role
  if (user && user.role === 'DEPT_RESP') {
    router.navigate(['/manager']);
  } else {
    router.navigate(['/employee']);
  }
  return false;
};
