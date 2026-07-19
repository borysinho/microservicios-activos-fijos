import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ManualSection {
  id: string;
  label: string;
}

interface ManualStep {
  title: string;
  body: string;
  tone: 'accent' | 'cyan' | 'green' | 'amber' | 'red';
}

interface ModuleGuide {
  title: string;
  route: string;
  summary: string;
  tasks: string[];
}

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manual.component.html',
  styleUrl: './manual.component.scss',
})
export class ManualComponent {
  sections: ManualSection[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'roles', label: 'Roles' },
    { id: 'operaciones', label: 'Operaciones' },
    { id: 'modulos', label: 'Modulos' },
    { id: 'auditoria', label: 'Auditoria' },
    { id: 'soporte', label: 'Soporte' },
  ];

  quickSteps: ManualStep[] = [
    {
      title: 'Ingresar al sistema',
      body: 'Abra la pantalla de login, escriba su usuario y contrasena asignados por administracion y confirme el ingreso.',
      tone: 'accent',
    },
    {
      title: 'Ubicar el activo',
      body: 'Use Inventario para buscar por codigo, categoria, estado o area antes de registrar una operacion.',
      tone: 'cyan',
    },
    {
      title: 'Registrar el movimiento',
      body: 'Complete los datos solicitados en asignaciones, traslados, mantenimiento o bajas segun el proceso.',
      tone: 'green',
    },
    {
      title: 'Adjuntar respaldo',
      body: 'Suba facturas, actas, imagenes o contratos en Expedientes para conservar evidencia versionada.',
      tone: 'amber',
    },
  ];

  modules: ModuleGuide[] = [
    {
      title: 'Inventario',
      route: '/activos',
      summary: 'Consulta y mantenimiento del registro maestro de activos fijos.',
      tasks: ['Crear activos', 'Editar datos generales', 'Cambiar estado', 'Revisar historial'],
    },
    {
      title: 'Responsables',
      route: '/asignaciones',
      summary: 'Controla que cada activo tenga responsable y area asignada.',
      tasks: ['Asignar custodio', 'Ver asignaciones activas', 'Actualizar responsabilidad'],
    },
    {
      title: 'Movimientos',
      route: '/traslados',
      summary: 'Gestiona traslados entre areas con confirmacion del responsable.',
      tasks: ['Registrar traslado', 'Confirmar recepcion', 'Auditar ubicacion'],
    },
    {
      title: 'Expedientes',
      route: '/documentos',
      summary: 'Administra documentos, versiones y accesos asociados a cada activo.',
      tasks: ['Subir archivos', 'Publicar nueva version', 'Consultar auditoria'],
    },
    {
      title: 'Prediccion',
      route: '/machine-learning',
      summary: 'Apoya decisiones con diagnostico IA, vida util estimada y clustering.',
      tasks: ['Analizar estado', 'Estimar vida util', 'Ver segmentos'],
    },
    {
      title: 'Trazabilidad',
      route: '/blockchain',
      summary: 'Verifica hashes inmutables de transacciones relevantes del activo.',
      tasks: ['Consultar cadena', 'Validar integridad', 'Revisar transacciones'],
    },
  ];

  roles = [
    ['ADMINISTRADOR', 'Gestion completa de activos, catalogos, usuarios y procesos críticos.'],
    ['RESPONSABLE_AREA', 'Operacion diaria de activos asignados, incidencias y confirmaciones.'],
    ['AUDITOR', 'Consulta de inventario, reportes, documentos, auditoria y blockchain.'],
    ['SOLO_LECTURA', 'Acceso de consulta a informacion permitida sin modificar registros.'],
  ];
}
