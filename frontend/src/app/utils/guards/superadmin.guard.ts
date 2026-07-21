import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SuperadminAuthService } from '../../services/superadmin-auth.service';

export const SuperadminGuard: CanActivateFn = () => {
  const svc = inject(SuperadminAuthService);
  const router = inject(Router);

  if (svc.isAuthenticated()) return true;

  router.navigate(['/superadmin/login']);
  return false;
};
