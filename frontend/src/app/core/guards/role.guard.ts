import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';
import { ROUTE_ROLES, canAccessRoute, hasAnyRole } from '../auth/permissions';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const routePath = route.routeConfig?.path ?? '';
  const currentRole = auth.currentUser()?.rol;

  if (allowedRoles?.length && hasAnyRole(currentRole, allowedRoles)) {
    return true;
  }

  if (!allowedRoles?.length && canAccessRoute(currentRole, routePath)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

export const routeRoles = (path: keyof typeof ROUTE_ROLES): UserRole[] => ROUTE_ROLES[path];
