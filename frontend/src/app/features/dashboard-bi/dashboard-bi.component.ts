import { Component, OnInit, ViewChild, ElementRef, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { environment } from '../../../environments/environment';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import { Ms2Service } from '../../core/services/ms2.service';
import type { DashboardMetricasDTO } from '../../core/models/models';
import type { ClusteringResult } from '../../core/services/ms2.service';
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
  @ViewChild('lineCanvas') lineRef?: ElementRef<HTMLCanvasElement>;

  private gql = inject(ActivosGqlService);
  private ms2 = inject(Ms2Service);
  private auth = inject(AuthService);
  private router = inject(Router);
  private sub?: Subscription;
  private subClustering?: Subscription;
  private charts: Chart[] = [];

  data = signal<DashboardMetricasDTO | null>(null);
  // CU-59: Proyección de vida útil de activos críticos
  clusteringData = signal<ClusteringResult | null>(null);
  clusteringLoading = signal(false);
  loading = signal(true);
  error = signal('');
  refreshing = signal(false);

  ngOnInit(): void {
    this.load();
    this.loadClustering();
  }

  // CU-59: Carga activos críticos desde el clustering de MS2
  private loadClustering(): void {
    this.clusteringLoading.set(true);
    this.subClustering = this.ms2.clustering().subscribe({
      next: (r) => {
        this.clusteringData.set(r);
        this.clusteringLoading.set(false);
      },
      error: () => this.clusteringLoading.set(false),
    });
  }

  // Obtiene el cluster de "Alta criticidad" para CU-59
  get activosCriticos(): string[] {
    return this.clusteringData()?.clusters.find((c) => c.id === 0)?.activos ?? [];
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
    // Cobertura amplia: HttpErrorResponse (.status), ServerError/ServerParseError
    // (.statusCode, .response.status) y CORS-blocked 401 que llega como status 0
    const httpStatus =
      err?.networkError?.status ??
      err?.networkError?.statusCode ??
      err?.networkError?.response?.status;

    const isUnauthorized =
      err?.graphQLErrors?.some(
        (e: any) =>
          e?.extensions?.classification === 'UNAUTHORIZED' ||
          e?.message?.toLowerCase().includes('unauthorized') ||
          e?.message?.toLowerCase().includes('access denied'),
      ) ||
      httpStatus === 401 ||
      httpStatus === 403 ||
      // status 0 = CORS bloqueado, típicamente por 401/403 de Spring Security
      // antes de que se añadan los headers CORS → tratar como sesión expirada
      (err?.networkError != null && httpStatus === 0);

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
    this.subClustering?.unsubscribe();
    this.charts.forEach((c) => c.destroy());
  }

  private renderCharts(d: DashboardMetricasDTO): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    const palette = ['#0f766e', '#2563eb', '#22c55e', '#ef4444', '#f59e0b', '#a855f7'];
    const gridColor = '#d9e2ec';
    const textColor = '#536276';

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
              borderColor: '#ffffff',
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
                font: { family: 'Inter', size: 12 },
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
              ticks: { color: textColor, font: { family: 'Inter' } },
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter' } },
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
              backgroundColor: '#2563eb',
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
              ticks: { color: textColor, font: { family: 'Inter' } },
              beginAtZero: true,
            },
            y: {
              grid: { color: 'transparent' },
              ticks: { color: textColor, font: { family: 'Inter' } },
            },
          },
        },
      }),
    );

    // CU-58: Línea — tendencia de adquisiciones por año
    if (this.lineRef && d.adquisicionesPorAnio?.length) {
      this.charts.push(
        new Chart(this.lineRef.nativeElement, {
          type: 'line',
          data: {
            labels: d.adquisicionesPorAnio.map((p) => String(p.anio)),
            datasets: [
              {
                label: 'Adquisiciones',
                data: d.adquisicionesPorAnio.map((p) => p.cantidad),
                borderColor: '#0f766e',
                backgroundColor: '#0f766e22',
                borderWidth: 2,
                pointBackgroundColor: '#0f766e',
                pointRadius: 4,
                fill: true,
                tension: 0.4,
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
                ticks: { color: textColor, font: { family: 'Inter' } },
              },
              y: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Inter' }, stepSize: 1 },
                beginAtZero: true,
              },
            },
          },
        }),
      );
    }
  }

  // CU-60: Exportar reporte BI en PDF usando window.print()
  exportarPDF(): void {
    window.print();
  }

  porcentaje(valor: number, total: number): number {
    if (!total) return 0;
    return Math.round((valor / total) * 100);
  }
}
