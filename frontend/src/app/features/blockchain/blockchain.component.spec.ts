import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { BlockchainComponent } from './blockchain.component';

describe('BlockchainComponent', () => {
  let fixture: ComponentFixture<BlockchainComponent>;
  let component: BlockchainComponent;
  let gql: {
    getActivos: ReturnType<typeof vi.fn>;
    getHistorialBlockchain: ReturnType<typeof vi.fn>;
    verificarIntegridadBlockchain: ReturnType<typeof vi.fn>;
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
      verificarIntegridadBlockchain: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [BlockchainComponent],
      providers: [{ provide: ActivosGqlService, useValue: gql }],
    }).compileComponents();

    fixture = TestBed.createComponent(BlockchainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lista registros cuando cambia el activo seleccionado', () => {
    component.selectedActivoId.set('activo-1');

    component.cargar();

    expect(gql.getHistorialBlockchain).toHaveBeenCalledWith('activo-1');
    expect(component.registros()[0].id).toBe('reg-1');
  });

  it('limpia los registros si se vuelve al selector vacio', () => {
    component.registros.set([{ id: 'reg-1' } as any]);
    component.selectedActivoId.set('');

    component.cargar();

    expect(component.registros()).toEqual([]);
    expect(gql.getHistorialBlockchain).not.toHaveBeenCalled();
  });
});
