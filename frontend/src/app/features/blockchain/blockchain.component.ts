import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { Activo, RegistroBlockchain } from '../../core/models/models';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/';

@Component({
  selector: 'app-blockchain',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './blockchain.component.html',
  styleUrl: './blockchain.component.scss',
})
export class BlockchainComponent implements OnInit {
  private gql = inject(ActivosGqlService);

  activos = signal<Activo[]>([]);
  registros = signal<RegistroBlockchain[]>([]);
  loading = signal(false);
  error = signal('');
  selectedActivoId = signal<string>('');
  readonly etherscanBase = ETHERSCAN_BASE;

  readonly tipoColors: Record<string, string> = {
    REGISTRO: 'badge--info',
    ASIGNACION: 'badge--success',
    TRASLADO: 'badge--warning',
    MANTENIMIENTO: 'badge--secondary',
    BAJA: 'badge--danger',
  };

  ngOnInit(): void {
    this.gql.getActivos().subscribe((data) => this.activos.set(data));
  }

  cargar(): void {
    if (!this.selectedActivoId()) {
      this.registros.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.gql.getHistorialBlockchain(this.selectedActivoId()).subscribe({
      next: (data) => {
        this.registros.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al consultar la blockchain.');
        this.loading.set(false);
      },
    });
  }

  badgeClass(tipo: string): string {
    return `badge ${this.tipoColors[tipo] || 'badge--secondary'}`;
  }

  etherscanUrl(hash: string): string {
    return `${this.etherscanBase}${hash}`;
  }

  // ── CU-81: Verificar integridad de registro blockchain ───────────────────
  integridadMap = signal<Record<string, boolean | null>>({});

  verificarIntegridad(registroId: string): void {
    this.integridadMap.update((m) => ({ ...m, [registroId]: null })); // pendiente
    this.gql.verificarIntegridadBlockchain(registroId).subscribe({
      next: (ok) => this.integridadMap.update((m) => ({ ...m, [registroId]: ok })),
      error: () => this.integridadMap.update((m) => ({ ...m, [registroId]: false })),
    });
  }

  integridadBadge(registroId: string): string {
    const val = this.integridadMap()[registroId];
    if (val === undefined) return '';
    if (val === null) return '⏳';
    return val ? '✅' : '❌';
  }
}
