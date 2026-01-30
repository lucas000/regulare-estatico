import { HttpInterceptorFn } from '@angular/common/http';

// Placeholder interceptor for future multi-tenant headers / auth tokens.
// Currently passes through, but keeps a hook to add headers like companyId.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Example: attach a custom header for tracing
  const cloned = req.clone({
    setHeaders: {
      'X-SYSMVN-Client': 'web',
    },
  });
  return next(cloned);
};
