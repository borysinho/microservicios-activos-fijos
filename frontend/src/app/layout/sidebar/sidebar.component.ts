import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  auth = inject(AuthService);

  nav: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Activos', route: '/activos', icon: 'activos' },
    { label: 'Asignaciones', route: '/asignaciones', icon: 'asignaciones' },
    { label: 'Traslados', route: '/traslados', icon: 'traslados' },
    { label: 'Bajas', route: '/bajas', icon: 'bajas', roles: ['ADMINISTRADOR', 'AUDITOR'] },
    {
      label: 'Depreciación',
      route: '/depreciacion',
      icon: 'depreciacion',
      roles: ['ADMINISTRADOR', 'AUDITOR'],
    },
    { label: 'Documentos', route: '/documentos', icon: 'documentos' },
    { label: 'Auditoría', route: '/auditoria', icon: 'auditoria' },
    { label: 'Machine Learning', route: '/machine-learning', icon: 'ml' },
    { label: 'Blockchain', route: '/blockchain', icon: 'blockchain' },
    { label: 'Categorías', route: '/categorias', icon: 'categorias', roles: ['ADMINISTRADOR'] },
    { label: 'Áreas', route: '/areas', icon: 'areas', roles: ['ADMINISTRADOR'] },
    { label: 'Usuarios', route: '/usuarios', icon: 'usuarios', roles: ['ADMINISTRADOR'] },
  ];

  get filteredNav(): NavItem[] {
    return this.nav.filter((item) => !item.roles || this.auth.hasRole(...(item.roles as any[])));
  }
}
