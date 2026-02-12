import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';
import { UsersRepository } from './users.repository';
import { map, of, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly usersRepo = inject(UsersRepository);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  readonly user: Signal<User | null> = this._user.asReadonly();

  private readonly _loading = signal<boolean>(true);
  readonly loading = this._loading.asReadonly();

  // Admin scope (global company filter for ADMIN)
  private readonly _adminScopeCompanyId = signal<string | null>(readFromStorage('adminScopeCompanyId'));
  private readonly _adminScopeCompanyName = signal<string | null>(readFromStorage('adminScopeCompanyName'));
  readonly adminScopeCompanyId = computed(() => this._adminScopeCompanyId());
  readonly adminScopeCompanyName = computed(() => this._adminScopeCompanyName());

  constructor() {
    // React to Firebase auth state changes
    this.auth.authState$
      .pipe(
        switchMap((fb) => {
          if (!fb) return of(null);
          return this.usersRepo.doc$(fb.uid).pipe(
            map((doc) => {
              if (!doc) return null;
              return { ...doc, id: fb.uid } satisfies User;
            })
          );
        })
      )
      .subscribe({
        next: (u) => {
          this._user.set(u);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      });
  }

  isAuthenticated(): boolean {
    return !!this._user();
  }

  hasRole(roles: readonly User['profile'][]): boolean {
    const u = this._user();
    if (!u) return false;
    return roles.includes(u.profile);
  }

  setAdminScopeCompany(companyId: string | null, companyName?: string | null) {
    this._adminScopeCompanyId.set(companyId ?? null);
    this._adminScopeCompanyName.set(companyName ?? null);
    writeToStorage('adminScopeCompanyId', companyId ?? null);
    writeToStorage('adminScopeCompanyName', companyName ?? null);
  }

  clearAdminScope() { this.setAdminScopeCompany(null, null); }

  logout() {
    return this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}

function readFromStorage(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: string | null) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}
