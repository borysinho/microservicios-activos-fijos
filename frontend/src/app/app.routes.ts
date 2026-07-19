import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard, routeRoles } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'manual',
    loadComponent: () =>
      import('./features/manual/manual.component').then((m) => m.ManualComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: routeRoles('dashboard') },
        loadComponent: () =>
          import('./features/dashboard-bi/dashboard-bi.component').then(
            (m) => m.DashboardBiComponent,
          ),
      },
      {
        path: 'activos',
        canActivate: [roleGuard],
        data: { roles: routeRoles('activos') },
        loadComponent: () =>
          import('./features/activos/activos.component').then((m) => m.ActivosComponent),
      },
      {
        path: 'incidencias',
        canActivate: [roleGuard],
        data: { roles: routeRoles('incidencias') },
        loadComponent: () =>
          import('./features/incidencias/incidencias.component').then(
            (m) => m.IncidenciasComponent,
          ),
      },
      {
        path: 'depreciacion',
        canActivate: [roleGuard],
        data: { roles: routeRoles('depreciacion') },
        loadComponent: () =>
          import('./features/depreciacion/depreciacion.component').then(
            (m) => m.DepreciacionComponent,
          ),
      },
      {
        path: 'documentos',
        canActivate: [roleGuard],
        data: { roles: routeRoles('documentos') },
        loadComponent: () =>
          import('./features/documentos/documentos.component').then((m) => m.DocumentosComponent),
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard],
        data: { roles: routeRoles('auditoria') },
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
      {
        path: 'machine-learning',
        canActivate: [roleGuard],
        data: { roles: routeRoles('machine-learning') },
        loadComponent: () =>
          import('./features/machine-learning/machine-learning.component').then(
            (m) => m.MachineLearningComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: routeRoles('usuarios') },
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'asignaciones',
        canActivate: [roleGuard],
        data: { roles: routeRoles('asignaciones') },
        loadComponent: () =>
          import('./features/asignaciones/asignaciones.component').then(
            (m) => m.AsignacionesComponent,
          ),
      },
      {
        path: 'traslados',
        canActivate: [roleGuard],
        data: { roles: routeRoles('traslados') },
        loadComponent: () =>
          import('./features/traslados/traslados.component').then((m) => m.TrasladosComponent),
      },
      {
        path: 'bajas',
        canActivate: [roleGuard],
        data: { roles: routeRoles('bajas') },
        loadComponent: () =>
          import('./features/bajas/bajas.component').then((m) => m.BajasComponent),
      },
      {
        path: 'categorias',
        canActivate: [roleGuard],
        data: { roles: routeRoles('categorias') },
        loadComponent: () =>
          import('./features/categorias/categorias.component').then((m) => m.CategoriasComponent),
      },
      {
        path: 'areas',
        canActivate: [roleGuard],
        data: { roles: routeRoles('areas') },
        loadComponent: () =>
          import('./features/areas/areas.component').then((m) => m.AreasComponent),
      },
      {
        path: 'blockchain',
        canActivate: [roleGuard],
        data: { roles: routeRoles('blockchain') },
        loadComponent: () =>
          import('./features/blockchain/blockchain.component').then((m) => m.BlockchainComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
