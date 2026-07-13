import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { Ms3Service, Notificacion } from '../../core/services/ms3.service';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Resumen ejecutivo',
  '/activos': 'Inventario de activos',
  '/asignaciones': 'Responsables asignados',
  '/traslados': 'Movimientos de activos',
  '/bajas': 'Retiro de activos',
  '/depreciacion': 'Valor contable',
  '/documentos': 'Expedientes digitales',
  '/auditoria': 'Auditoría',
  '/machine-learning': 'Predicción de mantenimiento',
  '/blockchain': 'Trazabilidad',
  '/categorias': 'Catálogos de activos',
  '/areas': 'Organización',
  '/usuarios': 'Usuarios y permisos',
};

const ROL_BADGE_CLASS: Record<string, string> = {
  ADMINISTRADOR: 'navbar__role-badge navbar__role-badge--admin',
  AUDITOR: 'navbar__role-badge navbar__role-badge--auditor',
  RESPONSABLE_AREA: 'navbar__role-badge navbar__role-badge--responsable',
  SOLO_LECTURA: 'navbar__role-badge navbar__role-badge--lector',
};

const AVATAR_CLASS: Record<string, string> = {
  ADMINISTRADOR: 'navbar__avatar navbar__avatar--admin',
  AUDITOR: 'navbar__avatar navbar__avatar--auditor',
  RESPONSABLE_AREA: 'navbar__avatar navbar__avatar--responsable',
  SOLO_LECTURA: 'navbar__avatar',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private ms3 = inject(Ms3Service);
  private sub?: Subscription;

  notificaciones: Notificacion[] = [];
  panelAbierto = false;

  ngOnInit(): void {
    this.sub = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => {
          const user = this.auth.currentUser();
          return user
            ? this.ms3.listarNotificaciones(user.id).pipe(catchError(() => of([])))
            : of([]);
        }),
      )
      .subscribe((notificaciones) => {
        this.notificaciones = notificaciones;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get pageTitle(): string {
    return ROUTE_TITLES[location.pathname] ?? 'Sistema de Activos Fijos';
  }

  get today(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter((notificacion) => !notificacion.leida).length;
  }

  togglePanelNotificaciones(): void {
    this.panelAbierto = !this.panelAbierto;
  }

  marcarLeida(notificacion: Notificacion): void {
    const user = this.auth.currentUser();
    if (!user || notificacion.leida) {
      return;
    }

    this.ms3.marcarNotificacionLeida(user.id, notificacion.id).subscribe({
      next: () => {
        this.notificaciones = this.notificaciones.map((item) =>
          item.id === notificacion.id ? { ...item, leida: true } : item,
        );
      },
    });
  }

  notificationClass(tipo: Notificacion['tipo']): string {
    return `navbar__notification-item navbar__notification-item--${tipo}`;
  }

  formatNotificationDate(value: string): string {
    return new Date(value).toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
