import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { Ms2Service } from '../../core/services/ms2.service';
import type { RegistroBlockchain } from '../../core/models/models';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss',
})
export class AuditoriaComponent {
  private gql = inject(ActivosGqlService);
  private ms2 = inject(Ms2Service);

  tab = signal<'blockchain' | 'logs'>('blockchain');
  activoId = signal('');
  docIdAudit = signal('');
  historial = signal<RegistroBlockchain[]>([]);
  auditLogs = signal<any[]>([]);
  loading = signal(false);

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
