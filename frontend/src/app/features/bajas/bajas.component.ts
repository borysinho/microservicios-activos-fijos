import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { Activo, Baja, Usuario } from '../../core/models/models';

@Component({
  selector: 'app-bajas',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './bajas.component.html',
  styleUrl: './bajas.component.scss',
})
export class BajasComponent implements OnInit {
  private gql = inject(ActivosGqlService);

  activos = signal<Activo[]>([]);
  usuarios = signal<Usuario[]>([]);
  bajas = signal<Baja[]>([]);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  showModal = signal(false);
  searchTerm = '';

  form = {
    activoId: '',
    autorizadoPorId: '',
    motivo: '',
    valorResidual: 0,
    numeroResolucion: '',
  };

  ngOnInit(): void {
    this.cargar();
    this.gql.getActivos().subscribe((data) => this.activos.set(data));
    this.gql.getUsuarios().subscribe((data) => this.usuarios.set(data));
  }

  cargar(): void {
    this.loading.set(true);
    this.gql.getBajas().subscribe({
      next: (data) => {
        this.bajas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar bajas.');
        this.loading.set(false);
      },
    });
  }

  get bajasFiltradas(): Baja[] {
    if (!this.searchTerm) return this.bajas();
    const term = this.searchTerm.toLowerCase();
    return this.bajas().filter(
      (b) =>
        b.activo?.nombre?.toLowerCase().includes(term) ||
        b.activo?.codigo?.toLowerCase().includes(term) ||
        b.motivo?.toLowerCase().includes(term),
    );
  }

  get activosActivos(): Activo[] {
    return this.activos().filter((a) => a.estado !== 'DADO_DE_BAJA');
  }

  openModal(): void {
    this.form = {
      activoId: '',
      autorizadoPorId: '',
      motivo: '',
      valorResidual: 0,
      numeroResolucion: '',
    };
    this.showModal.set(true);
  }

  guardar(): void {
    if (!this.form.activoId || !this.form.autorizadoPorId || !this.form.motivo) return;
    this.saving.set(true);
    this.error.set('');
    this.gql.darDeBaja(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.success.set('Activo dado de baja correctamente.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.message || 'Error.');
      },
    });
  }

  // ── CU-25: Generación de Acta de Baja en PDF ─────────────────────────────
  generarActaPDF(baja: Baja): void {
    const fecha = baja.fecha
      ? new Date(baja.fecha).toLocaleDateString('es-BO', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—';
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta de Baja — ${baja.activo?.codigo ?? ''}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
    h2 { text-align: center; font-size: 14px; font-weight: normal; color: #555; margin-top: 0; }
    hr { border: none; border-top: 2px solid #333; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f0f0f0; text-align: left; padding: 8px 12px; font-size: 13px; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #ddd; }
    .resolucion { margin-top: 24px; font-size: 12px; color: #555; }
    .firma { margin-top: 60px; display: flex; justify-content: space-between; }
    .firma-linea { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 6px; font-size: 12px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>ACTA DE BAJA DE ACTIVO FIJO</h1>
  <h2>Sistema de Gestión de Activos Fijos</h2>
  <hr>
  <table>
    <tr><th>N° Resolución</th><td>${baja.numeroResolucion ?? '—'}</td></tr>
    <tr><th>Fecha de Baja</th><td>${fecha}</td></tr>
    <tr><th>Código del Activo</th><td>${baja.activo?.codigo ?? '—'}</td></tr>
    <tr><th>Nombre del Activo</th><td>${baja.activo?.nombre ?? '—'}</td></tr>
    <tr><th>Motivo de Baja</th><td>${baja.motivo ?? '—'}</td></tr>
    <tr><th>Valor Residual</th><td>BOB ${baja.valorResidual?.toFixed(2) ?? '0.00'}</td></tr>
    <tr><th>Autorizado por</th><td>${baja.autorizadoPor?.username ?? '—'}</td></tr>
  </table>
  <p class="resolucion">
    El presente documento certifica que el activo fijo indicado ha sido retirado definitivamente
    del registro patrimonial de la organización mediante la resolución N° ${baja.numeroResolucion ?? '—'},
    con fecha ${fecha}.
  </p>
  <div class="firma">
    <div class="firma-linea">Responsable de Área</div>
    <div class="firma-linea">Autorizado por<br>${baja.autorizadoPor?.username ?? ''}</div>
    <div class="firma-linea">Auditor</div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
}
