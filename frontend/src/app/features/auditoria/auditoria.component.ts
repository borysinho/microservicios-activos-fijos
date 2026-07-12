import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { DocumentoMetadata, Ms2Service } from '../../core/services/ms2.service';
import type { Activo, RegistroBlockchain } from '../../core/models/models';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss',
})
export class AuditoriaComponent implements OnInit {
  private gql = inject(ActivosGqlService);
  private ms2 = inject(Ms2Service);

  tab = signal<'blockchain' | 'logs'>('blockchain');
  activoId = signal('');
  activoDocumentosId = signal('');
  docIdAudit = signal('');
  activos = signal<Activo[]>([]);
  documentos = signal<DocumentoMetadata[]>([]);
  historial = signal<RegistroBlockchain[]>([]);
  auditLogs = signal<any[]>([]);
  loading = signal(false);
  loadingActivos = signal(false);
  loadingDocumentos = signal(false);

  ngOnInit(): void {
    this.loadingActivos.set(true);
    this.gql.getActivos().subscribe({
      next: (data) => {
        this.activos.set(data);
        this.loadingActivos.set(false);
      },
      error: () => this.loadingActivos.set(false),
    });
  }

  buscarBlockchain(): void {
    if (!this.activoId()) return;
    this.loading.set(true);
    this.gql.getHistorialBlockchain(this.activoId()).subscribe({
      next: (h) => {
        this.historial.set(h);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cargarDocumentos(): void {
    this.docIdAudit.set('');
    this.auditLogs.set([]);
    this.documentos.set([]);
    if (!this.activoDocumentosId()) return;
    this.loadingDocumentos.set(true);
    this.ms2.listarDocumentos(this.activoDocumentosId()).subscribe({
      next: (docs) => {
        this.documentos.set(docs);
        this.loadingDocumentos.set(false);
      },
      error: () => this.loadingDocumentos.set(false),
    });
  }

  buscarAuditoria(): void {
    if (!this.docIdAudit()) return;
    this.loading.set(true);
    this.ms2.logAuditoriaDocumento(this.docIdAudit()).subscribe({
      next: (d) => {
        this.auditLogs.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  tipoColor(tipo?: string): string {
    const map: Record<string, string> = {
      REGISTRO: 'badge badge--success',
      ASIGNACION: 'badge badge--info',
      TRASLADO: 'badge badge--warning',
      BAJA: 'badge badge--danger',
    };
    return map[tipo ?? ''] ?? 'badge';
  }
}
