import { Component, OnInit, ViewChild, ElementRef, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { environment } from '../../../environments/environment';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import type { DashboardMetricasDTO } from '../../core/models/models';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-bi',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './dashboard-bi.component.html',
  styleUrl: './dashboard-bi.component.scss',
})
export class DashboardBiComponent implements OnInit, OnDestroy {
  @ViewChild('donutCanvas') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('areaCanvas') areaRef!: ElementRef<HTMLCanvasElement>;

  private gql = inject(ActivosGqlService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private sub?: Subscription;
  private charts: Chart[] = [];

  data = signal<DashboardMetricasDTO | null>(null);
  loading = signal(true);
  error = signal('');
  refreshing = signal(false);

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.refreshing.set(true);
    this.sub?.unsubscribe();
    this.sub = this.gql.getDashboardBI().subscribe({
      next: (d) => {
        this.data.set(d);
        this.refreshing.set(false);
        setTimeout(() => this.renderCharts(d), 0);
      },
      error: (err) => {
        this.refreshing.set(false);
        this.handleError(err);
      },
    });
  }

  private load(): void {
    this.sub = this.gql.getDashboardBI().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        setTimeout(() => this.renderCharts(d), 0);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleError(err);
      },
    });
  }

  private handleError(err: any): void {
    const isUnauthorized =
      err?.graphQLErrors?.some(
        (e: any) =>
          e?.extensions?.classification === 'UNAUTHORIZED' ||
          e?.message?.toLowerCase().includes('unauthorized') ||
          e?.message?.toLowerCase().includes('access denied'),
      ) ||
      err?.networkError?.status === 401 ||
      err?.networkError?.status === 403;

    if (isUnauthorized) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return;
    }

    const msg = err?.networkError
      ? `Error de red: no se pudo alcanzar MS1 (${environment.ms1GraphqlUrl})`
      : (err?.graphQLErrors?.[0]?.message ?? 'Error desconocido al cargar métricas');
    this.error.set(msg);
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.charts.forEach((c) => c.destroy());
  }

  private renderCharts(d: DashboardMetricasDTO): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    const palette = ['#f0a500', '#00cfd8', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'];
    const gridColor = '#1e3356';
    const textColor = '#8da3c0';

    // Donut: activos por estado
    this.charts.push(
      new Chart(this.donutRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Activos', 'Mantenimiento', 'Transferidos', 'Baja'],
          datasets: [
            {
              data: [
                d.activosActivos,
                d.activosEnMantenimiento,
                d.activosTransferidos,
                d.activosDadoDeBaja,
              ],
              backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'],
              borderColor: '#0d1526',
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColor,
                padding: 14,
                font: { family: 'Space Grotesk', size: 12 },
              },
            },
          },
        },
      }),
    );

    // Bar: activos por categoría
    this.charts.push(
      new Chart(this.barRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.activosPorCategoria.map((c) => c.categoria),
          datasets: [
            {
              label: 'Activos',
              data: d.activosPorCategoria.map((c) => c.cantidad),
              backgroundColor: palette,
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Space Grotesk' } },
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Space Grotesk' } },
              beginAtZero: true,
            },
          },
        },
      }),
    );

    // Bar horizontal: activos por área
    this.charts.push(
      new Chart(this.areaRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.activosPorArea.map((a) => a.area),
          datasets: [
            {
              label: 'Activos',
              data: d.activosPorArea.map((a) => a.cantidad),
              backgroundColor: '#00cfd8',
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Space Grotesk' } },
              beginAtZero: true,
            },
            y: {
              grid: { color: 'transparent' },
              ticks: { color: textColor, font: { family: 'Space Grotesk' } },
            },
          },
        },
      }),
    );
  }
}
