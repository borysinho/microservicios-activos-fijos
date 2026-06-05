import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard-bi/dashboard-bi.component').then(
            (m) => m.DashboardBiComponent,
          ),
      },
      {
        path: 'activos',
        loadComponent: () =>
          import('./features/activos/activos.component').then((m) => m.ActivosComponent),
      },
      {
        path: 'depreciacion',
        loadComponent: () =>
          import('./features/depreciacion/depreciacion.component').then(
            (m) => m.DepreciacionComponent,
          ),
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/documentos/documentos.component').then((m) => m.DocumentosComponent),
      },
      {
        path: 'auditoria',
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
      {
        path: 'machine-learning',
        loadComponent: () =>
          import('./features/machine-learning/machine-learning.component').then(
            (m) => m.MachineLearningComponent,
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'asignaciones',
        loadComponent: () =>
          import('./features/asignaciones/asignaciones.component').then(
            (m) => m.AsignacionesComponent,
          ),
      },
      {
        path: 'traslados',
        loadComponent: () =>
          import('./features/traslados/traslados.component').then((m) => m.TrasladosComponent),
      },
      {
        path: 'bajas',
        loadComponent: () =>
          import('./features/bajas/bajas.component').then((m) => m.BajasComponent),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/categorias/categorias.component').then((m) => m.CategoriasComponent),
      },
      {
        path: 'areas',
        loadComponent: () =>
          import('./features/areas/areas.component').then((m) => m.AreasComponent),
      },
      {
        path: 'blockchain',
        loadComponent: () =>
          import('./features/blockchain/blockchain.component').then((m) => m.BlockchainComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
