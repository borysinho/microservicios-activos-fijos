import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import { Ms2Service } from '../../core/services/ms2.service';
import { DocumentosComponent } from './documentos.component';

describe('DocumentosComponent', () => {
  let fixture: ComponentFixture<DocumentosComponent>;
  let component: DocumentosComponent;
  let ms2: { listarDocumentos: ReturnType<typeof vi.fn> };

  const activo = {
    id: 'activo-1',
    codigo: 'ACT-2024-001',
    nombre: 'Laptop',
  } as any;

  beforeEach(async () => {
    ms2 = {
      listarDocumentos: vi.fn().mockReturnValue(
        of([
          {
            documentoId: 'doc-1',
            activoId: 'activo-1',
            nombre: 'factura.pdf',
            tipo: 'FACTURA',
            version: 1,
            fechaCreacion: '2026-07-14T10:00:00Z',
            activo: true,
          },
        ]),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentosComponent],
      providers: [
        { provide: Ms2Service, useValue: ms2 },
        { provide: ActivosGqlService, useValue: { getActivos: vi.fn().mockReturnValue(of([activo])) } },
        { provide: AuthService, useValue: { currentUser: () => ({ rol: 'ADMINISTRADOR' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga documentos cuando cambia el activo seleccionado', () => {
    component.activoId.set('activo-1');

    component.onActivoChange();

    expect(ms2.listarDocumentos).toHaveBeenCalledWith('activo-1', undefined);
    expect(component.documentos()[0].documentoId).toBe('doc-1');
    expect(component.docSeleccionado()).toBeNull();
    expect(component.mostrarAudit()).toBe(false);
  });

  it('aplica el filtro de tipo sobre el activo seleccionado', () => {
    component.activoId.set('activo-1');
    component.tipoFiltro.set('FACTURA');

    component.buscar();

    expect(ms2.listarDocumentos).toHaveBeenCalledWith('activo-1', 'FACTURA');
  });
});
