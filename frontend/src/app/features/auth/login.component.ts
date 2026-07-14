import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  login(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.error.set('Ingrese usuario y contraseña.');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.auth.loginWithCredentials(this.username.trim(), this.password).subscribe({
      next: (res) => {
        this.auth.login(res.token, {
          id: res.id,
          nombre: res.username,
          email: res.email,
          rol: res.rol as UserRole,
        });
        this.router.navigate(['/dashboard']);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          this.error.set('Credenciales incorrectas.');
        } else {
          this.error.set('No se pudo conectar con el sistema de activos. Verifique que el servicio esté activo.');
        }
        this.loading.set(false);
      },
    });
  }
}
