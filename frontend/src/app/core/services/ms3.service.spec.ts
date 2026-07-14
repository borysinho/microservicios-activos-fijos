import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Ms3Service } from './ms3.service';
import { environment } from '../../../environments/environment';

describe('Ms3Service', () => {
  let service: Ms3Service;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Ms3Service, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(Ms3Service);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('consulta el estado de flujos orquestados por MS3 sin invocar MS4 directo', () => {
    let flujos: any[] = [];

    service.listarFlujos().subscribe((data) => {
      flujos = data;
    });

    const req = http.expectOne(`${environment.ms3BaseUrl}/flujos`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'solicitud-revision',
        nombre: 'Solicitud de Revision por WhatsApp',
        estado: 'COMPLETADO',
        ultimaEjecucion: '2026-07-12T00:00:00Z',
      },
    ]);

    expect(flujos[0].id).toBe('solicitud-revision');
  });

  it('consulta un flujo especifico usando la fachada REST de MS3', () => {
    let estado: any;

    service.estadoFlujo('alerta-mantenimiento').subscribe((data) => {
      estado = data;
    });

    const req = http.expectOne(`${environment.ms3BaseUrl}/flujos/alerta-mantenimiento`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'alerta-mantenimiento',
      nombre: 'Alerta de Mantenimiento Programado',
      estado: 'EN_PROCESO',
      ultimaEjecucion: '2026-07-12T00:00:00Z',
    });

    expect(estado.estado).toBe('EN_PROCESO');
  });

  it('deduplica consultas simultaneas de notificaciones por usuario', () => {
    const respuestas: any[][] = [];

    service.listarNotificaciones('user-1').subscribe((data) => respuestas.push(data));
    service.listarNotificaciones('user-1').subscribe((data) => respuestas.push(data));

    const req = http.expectOne(`${environment.ms3BaseUrl}/notificaciones?usuarioId=user-1`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'not-1',
        usuarioId: 'user-1',
        tipo: 'alerta',
        titulo: 'Garantia por vencer',
        mensaje: 'Revision pendiente',
        leida: false,
        fechaCreacion: '2026-07-14T10:00:00Z',
      },
    ]);

    expect(respuestas).toHaveLength(2);
    expect(respuestas[0][0].id).toBe('not-1');
  });

  it('invalida cache de notificaciones al marcar una como leida', () => {
    service.listarNotificaciones('user-1').subscribe();
    http.expectOne(`${environment.ms3BaseUrl}/notificaciones?usuarioId=user-1`).flush([]);

    service.marcarNotificacionLeida('user-1', 'not-1').subscribe();
    const patch = http.expectOne(`${environment.ms3BaseUrl}/notificaciones/not-1/leida?usuarioId=user-1`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ actualizada: true, notificacion: null });

    service.listarNotificaciones('user-1').subscribe();
    http.expectOne(`${environment.ms3BaseUrl}/notificaciones?usuarioId=user-1`).flush([]);
  });
});
