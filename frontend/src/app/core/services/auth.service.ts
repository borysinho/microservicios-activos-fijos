import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export type UserRole = 'ADMINISTRADOR' | 'RESPONSABLE_AREA' | 'AUDITOR' | 'SOLO_LECTURA';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

interface LoginResponse {
  token: string;
  id: string;
  username: string;
  email: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'auth_user';

  currentUser = signal<AuthUser | null>(this.loadUser());

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  loginWithCredentials(username: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.ms1AuthUrl}/login`, { username, password });
  }

  login(token: string, user: AuthUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.rol) : false;
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
