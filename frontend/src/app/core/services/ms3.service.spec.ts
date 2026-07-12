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
});
