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
    { label: 'Inicio', route: '/dashboard', icon: 'dashboard' },
    { label: 'Inventario', route: '/activos', icon: 'activos' },
    { label: 'Responsables', route: '/asignaciones', icon: 'asignaciones' },
    { label: 'Movimientos', route: '/traslados', icon: 'traslados' },
    {
      label: 'Retiro de activos',
      route: '/bajas',
      icon: 'bajas',
      roles: ['ADMINISTRADOR', 'AUDITOR'],
    },
    {
      label: 'Valor contable',
      route: '/depreciacion',
      icon: 'depreciacion',
      roles: ['ADMINISTRADOR', 'AUDITOR'],
    },
    { label: 'Expedientes', route: '/documentos', icon: 'documentos' },
    { label: 'Auditoría', route: '/auditoria', icon: 'auditoria' },
    { label: 'Predicción', route: '/machine-learning', icon: 'ml' },
    { label: 'Trazabilidad', route: '/blockchain', icon: 'blockchain' },
    { label: 'Catálogos', route: '/categorias', icon: 'categorias', roles: ['ADMINISTRADOR'] },
    { label: 'Organización', route: '/areas', icon: 'areas', roles: ['ADMINISTRADOR'] },
    { label: 'Usuarios', route: '/usuarios', icon: 'usuarios', roles: ['ADMINISTRADOR'] },
  ];

  get filteredNav(): NavItem[] {
    return this.nav.filter((item) => !item.roles || this.auth.hasRole(...(item.roles as any[])));
  }
}
