import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const roles = route.data?.['roles'] as readonly string[] | undefined;
  if (!roles || roles.length === 0) return true;
  if (session.hasRole(roles as any)) return true;
  router.navigateByUrl('/app');
  return false;
};
