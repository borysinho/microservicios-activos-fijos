import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import { Ms2Service } from '../../core/services/ms2.service';
import { AuditoriaComponent } from './auditoria.component';

describe('AuditoriaComponent', () => {
  let fixture: ComponentFixture<AuditoriaComponent>;
  let component: AuditoriaComponent;
  let gql: {
    getActivos: ReturnType<typeof vi.fn>;
    getHistorialBlockchain: ReturnType<typeof vi.fn>;
  };
  let ms2: {
    listarDocumentos: ReturnType<typeof vi.fn>;
    logAuditoriaDocumento: ReturnType<typeof vi.fn>;
  };

  const activo = {
    id: 'activo-1',
    codigo: 'ACT-2024-001',
    nombre: 'Laptop',
  } as any;

  beforeEach(async () => {
    gql = {
      getActivos: vi.fn().mockReturnValue(of([activo])),
      getHistorialBlockchain: vi.fn().mockReturnValue(
        of([
          {
            id: 'reg-1',
            hash: '0xabc',
            tipoTransaccion: 'REGISTRO',
            payload: 'Alta inicial',
            timestamp: '2026-07-14T10:00:00Z',
          },
        ]),
      ),
    };
    ms2 = {
      listarDocumentos: vi.fn().mockReturnValue(
        of([
          {
            documentoId: 'doc-1',
            activoId: 'activo-1',
            nombre: 'factura.pdf',
            tipo: 'FACTURA',
            version: 1,
          },
        ]),
      ),
      logAuditoriaDocumento: vi.fn().mockReturnValue(
        of([
          {
            eventoId: 'evt-1',
            documentoId: 'doc-1',
            accion: 'DESCARGA',
            usuario: 'auditor',
            ipOrigen: '127.0.0.1',
            timestamp: '2026-07-14T10:00:00Z',
          },
        ]),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AuditoriaComponent],
      providers: [
        { provide: ActivosGqlService, useValue: gql },
        { provide: Ms2Service, useValue: ms2 },
        { provide: AuthService, useValue: { hasRole: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('consulta historial blockchain al seleccionar un activo y solicitar historial', () => {
    component.activoId.set('activo-1');

    component.buscarBlockchain();

    expect(gql.getHistorialBlockchain).toHaveBeenCalledWith('activo-1');
    expect(component.historial()[0].id).toBe('reg-1');
  });

  it('carga documentos del activo seleccionado para revisar accesos', () => {
    component.activoDocumentosId.set('activo-1');

    component.cargarDocumentos();

    expect(ms2.listarDocumentos).toHaveBeenCalledWith('activo-1');
    expect(component.documentos()[0].documentoId).toBe('doc-1');
    expect(component.docIdAudit()).toBe('');
    expect(component.auditLogs()).toEqual([]);
  });

  it('consulta auditoria del documento seleccionado', () => {
    component.docIdAudit.set('doc-1');

    component.buscarAuditoria();

    expect(ms2.logAuditoriaDocumento).toHaveBeenCalledWith('doc-1');
    expect(component.auditLogs()[0].eventoId).toBe('evt-1');
  });
});
