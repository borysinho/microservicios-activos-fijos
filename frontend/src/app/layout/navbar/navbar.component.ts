import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/activos': 'Gestión de Activos',
  '/documentos': 'Gestión Documental',
  '/auditoria': 'Auditoría y Blockchain',
  '/machine-learning': 'Machine Learning',
  '/usuarios': 'Usuarios y Configuración',
};

const ROL_BADGE_CLASS: Record<string, string> = {
  'ADMINISTRADOR':    'navbar__role-badge navbar__role-badge--admin',
  'AUDITOR':          'navbar__role-badge navbar__role-badge--auditor',
  'RESPONSABLE_AREA': 'navbar__role-badge navbar__role-badge--responsable',
  'SOLO_LECTURA':     'navbar__role-badge navbar__role-badge--lector',
};

const AVATAR_CLASS: Record<string, string> = {
  'ADMINISTRADOR':    'navbar__avatar navbar__avatar--admin',
  'AUDITOR':          'navbar__avatar navbar__avatar--auditor',
  'RESPONSABLE_AREA': 'navbar__avatar navbar__avatar--responsable',
  'SOLO_LECTURA':     'navbar__avatar',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  auth = inject(AuthService);

  get pageTitle(): string {
    return ROUTE_TITLES[location.pathname] ?? 'Sistema de Activos Fijos';
  }

  get today(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  get roleBadgeClass(): string {
    const rol = this.auth.currentUser()?.rol ?? '';
    return ROL_BADGE_CLASS[rol] ?? 'navbar__role-badge';
  }

  get avatarClass(): string {
    const rol = this.auth.currentUser()?.rol ?? '';
    return AVATAR_CLASS[rol] ?? 'navbar__avatar';
  }
}
