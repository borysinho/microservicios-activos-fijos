import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Ms2Service } from './ms2.service';
import { environment } from '../../../environments/environment';

describe('Ms2Service', () => {
  let service: Ms2Service;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Ms2Service, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(Ms2Service);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('sube documentos reales al endpoint documental con archivo, activo y tipo', () => {
    const archivo = new File(['factura'], 'factura.pdf', { type: 'application/pdf' });
    let respuesta: any;

    service.subirDocumento('activo-1', archivo, 'FACTURA').subscribe((data) => {
      respuesta = data;
    });

    const req = http.expectOne(`${environment.ms2BaseUrl}/documentos/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect(req.request.body.get('file')).toBe(archivo);
    expect(req.request.body.get('activoId')).toBe('activo-1');
    expect(req.request.body.get('tipo')).toBe('FACTURA');

    req.flush({
      documentoId: 'doc-1',
      activoId: 'activo-1',
      nombre: 'factura.pdf',
      tipo: 'FACTURA',
      s3Key: 'activo-1/doc-1/factura.pdf',
      s3Url: 'https://s3.example/factura.pdf',
      version: 1,
      subidoPor: 'auditor',
      fechaCreacion: '2026-07-12T00:00:00Z',
      activo: true,
    });

    expect(respuesta.documentoId).toBe('doc-1');
    expect(respuesta.version).toBe(1);
  });

  it('solicita diagnostico IA con imagen y activo opcional', () => {
    const imagen = new File(['img'], 'activo.jpg', { type: 'image/jpeg' });
    let respuesta: any;

    service.diagnosticarImagen(imagen, 'activo-2').subscribe((data) => {
      respuesta = data;
    });

    const req = http.expectOne(`${environment.ms2BaseUrl}/ia/diagnostico`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.get('imagen')).toBe(imagen);
    expect(req.request.body.get('activoId')).toBe('activo-2');

    req.flush({
      activoId: 'activo-2',
      diagnostico: 'EVIDENCIA_VALIDADA',
      confianza: 0.91,
      recomendacion: 'Registrar evidencia',
    });

    expect(respuesta.confianza).toBe(0.91);
  });

  it('consulta ML con parametros de vida util y clustering', () => {
    service
      .prediccionVidaUtil({
        categoriaId: 'cat-1',
        valorAdquisicion: 12000,
        aniosFabricacion: 3,
      })
      .subscribe();

    const prediccion = http.expectOne((req) => req.url === `${environment.ms2BaseUrl}/ml/prediccion-vida-util`);
    expect(prediccion.request.method).toBe('GET');
    expect(prediccion.request.params.get('categoriaId')).toBe('cat-1');
    expect(prediccion.request.params.get('valorAdquisicion')).toBe('12000');
    expect(prediccion.request.params.get('aniosFabricacion')).toBe('3');
    prediccion.flush({
      categoriaId: 'cat-1',
      vidaUtilRestante: 4,
      probabilidad_fallo_6m: 0.22,
      cluster: 1,
      cluster_label: 'Mantenimiento regular',
      confianza: 0.84,
      recomendacion_mantenimiento: 'Revisar en 6 meses',
    });

    service.clustering().subscribe();
    const clustering = http.expectOne(`${environment.ms2BaseUrl}/ml/clustering`);
    expect(clustering.request.method).toBe('GET');
    clustering.flush({ clusters: [] });
  });
});
