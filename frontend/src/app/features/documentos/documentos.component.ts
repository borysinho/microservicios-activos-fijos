import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ms2Service, DocumentoMetadata, EventoAuditoria } from '../../core/services/ms2.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { canPerform } from '../../core/auth/permissions';
import type { Activo } from '../../core/models/models';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './documentos.component.html',
  styleUrl: './documentos.component.scss',
})
export class DocumentosComponent implements OnInit {
  private ms2 = inject(Ms2Service);
  private auth = inject(AuthService);
  private gql = inject(ActivosGqlService);

  // ── Lista de activos desde MS1 ────────────────────────────────────────────
  activos = signal<Activo[]>([]);
  cargandoActivos = signal(false);

  // ── Estado de búsqueda ────────────────────────────────────────────────────
  activoId = signal('');
  tipoFiltro = signal('');
  documentos = signal<DocumentoMetadata[]>([]);
  loading = signal(false);

  // ── Estado de upload ──────────────────────────────────────────────────────
  uploading = signal(false);
  dragOver = signal(false);
  selectedFile: File | null = null;
  tipoDocumento = signal('CONTRATO');

  // ── Panel de versiones ────────────────────────────────────────────────────
  docSeleccionado = signal<DocumentoMetadata | null>(null);
  versiones = signal<DocumentoMetadata[]>([]);
  cargandoVersiones = signal(false);
  archivoNuevaVersion: File | null = null;
  subiendo = signal(false);

  // ── Panel de auditoría ────────────────────────────────────────────────────
  auditoria = signal<EventoAuditoria[]>([]);
  cargandoAudit = signal(false);
  mostrarAudit = signal(false);

  // ── IA ────────────────────────────────────────────────────────────────────
  diagnosing = signal(false);
  resultado = signal<any>(null);

  // ── Permisos ──────────────────────────────────────────────────────────────
  puedeSubirDocumento = computed(() => this.can('documento.subir'));
  puedeVersionarDocumento = computed(() => this.can('documento.versionar'));
  puedeEliminarDocumento = computed(() => this.can('documento.eliminar'));
  puedeVerAudit = computed(() => this.can('documento.verAuditoria'));
  puedeDiagnosticar = computed(() => this.can('ia.diagnosticar'));

  readonly tiposDocumento = ['CONTRATO', 'FACTURA', 'POLIZA', 'MANUAL', 'ACTA', 'OTRO'];

  ngOnInit(): void {
    this.cargandoActivos.set(true);
    this.gql.getActivos().subscribe({
      next: (data) => {
        this.activos.set(data);
        this.cargandoActivos.set(false);
      },
      error: () => this.cargandoActivos.set(false),
    });
  }

  onActivoChange(): void {
    this.documentos.set([]);
    this.docSeleccionado.set(null);
    this.mostrarAudit.set(false);
    if (this.activoId()) this.buscar();
  }

  // ── CU-33: Listar documentos ──────────────────────────────────────────────
  buscar(): void {
    if (!this.activoId()) return;
    this.loading.set(true);
    this.ms2.listarDocumentos(this.activoId(), this.tipoFiltro() || undefined).subscribe({
      next: (d) => {
        this.documentos.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (!this.puedeSubirDocumento() && !this.puedeDiagnosticar()) return;
    const file = e.dataTransfer?.files[0];
    if (file) this.selectedFile = file;
  }

  onFileSelect(e: Event): void {
    if (!this.puedeSubirDocumento() && !this.puedeDiagnosticar()) return;
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) this.selectedFile = input.files[0];
  }

  // ── CU-26: Subir documento ────────────────────────────────────────────────
  subir(): void {
    if (!this.puedeSubirDocumento()) return;
    if (!this.selectedFile || !this.activoId()) return;
    this.uploading.set(true);
    this.ms2.subirDocumento(this.activoId(), this.selectedFile, this.tipoDocumento()).subscribe({
      next: () => {
        this.uploading.set(false);
        this.selectedFile = null;
        this.buscar();
      },
      error: () => this.uploading.set(false),
    });
  }

  // ── CU-27: Descargar documento (URL presignada) ───────────────────────────
  descargar(doc: DocumentoMetadata): void {
    this.ms2.obtenerUrlDescarga(doc.documentoId).subscribe({
      next: ({ url }) => window.open(url, '_blank'),
    });
  }

  // ── CU-28/29: Ver versiones ───────────────────────────────────────────────
  verVersiones(doc: DocumentoMetadata): void {
    this.docSeleccionado.set(doc);
    this.mostrarAudit.set(false);
    this.cargandoVersiones.set(true);
    this.ms2.historialVersiones(doc.documentoId).subscribe({
      next: (v) => {
        this.versiones.set(v);
        this.cargandoVersiones.set(false);
      },
      error: () => this.cargandoVersiones.set(false),
    });
  }

  onArchivoNuevaVersion(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) this.archivoNuevaVersion = input.files[0];
  }

  // ── CU-28: Subir nueva versión ────────────────────────────────────────────
  subirNuevaVersion(): void {
    if (!this.puedeVersionarDocumento()) return;
    const doc = this.docSeleccionado();
    if (!doc || !this.archivoNuevaVersion) return;
    this.subiendo.set(true);
    this.ms2.nuevaVersion(doc.documentoId, this.archivoNuevaVersion).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.archivoNuevaVersion = null;
        this.verVersiones(doc);
        this.buscar();
      },
      error: () => this.subiendo.set(false),
    });
  }

  // ── CU-30: Eliminar documento ─────────────────────────────────────────────
  eliminar(doc: DocumentoMetadata): void {
    if (!this.puedeEliminarDocumento()) return;
    if (!confirm(`¿Eliminar "${doc.nombre}"? El registro de auditoría se conservará.`)) return;
    this.ms2.eliminarDocumento(doc.documentoId).subscribe({
      next: () => this.buscar(),
    });
  }

  // ── CU-31: Log de auditoría ───────────────────────────────────────────────
  verAuditoria(doc: DocumentoMetadata): void {
    if (!this.puedeVerAudit()) return;
    this.docSeleccionado.set(doc);
    this.mostrarAudit.set(true);
    this.versiones.set([]);
    this.cargandoAudit.set(true);
    this.ms2.logAuditoriaDocumento(doc.documentoId).subscribe({
      next: (e) => {
        this.auditoria.set(e);
        this.cargandoAudit.set(false);
      },
      error: () => this.cargandoAudit.set(false),
    });
  }

  cerrarPanel(): void {
    this.docSeleccionado.set(null);
    this.mostrarAudit.set(false);
    this.versiones.set([]);
    this.auditoria.set([]);
  }

  // ── IA ────────────────────────────────────────────────────────────────────
  diagnosticar(): void {
    if (!this.puedeDiagnosticar()) return;
    if (!this.selectedFile) return;
    this.diagnosing.set(true);
    this.ms2.diagnosticarImagen(this.selectedFile, this.activoId() || undefined).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.diagnosing.set(false);
      },
      error: () => this.diagnosing.set(false),
    });
  }

  private can(action: Parameters<typeof canPerform>[1]): boolean {
    return canPerform(this.auth.currentUser()?.rol, action);
  }
}
