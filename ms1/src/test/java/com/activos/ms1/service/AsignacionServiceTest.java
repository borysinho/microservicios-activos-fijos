package com.activos.ms1.service;

import com.activos.ms1.dto.input.AsignacionInput;
import com.activos.ms1.entity.*;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.ms3.MS3WebhookClient;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.AsignacionRepository;
import com.activos.ms1.repository.ResponsableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AsignacionServiceTest {

    @Mock
    AsignacionRepository asignacionRepository;
    @Mock
    ActivoService activoService;
    @Mock
    ResponsableRepository responsableRepository;
    @Mock
    AreaRepository areaRepository;
    @Mock
    BlockchainService blockchainService;
    @Mock
    MS3WebhookClient ms3WebhookClient;

    @InjectMocks
    AsignacionService asignacionService;

    private Activo activo;
    private Responsable responsable;
    private Area area;
    private Asignacion asignacion;
    private UUID activoId;
    private UUID responsableId;
    private UUID areaId;
    private UUID asignacionId;

    @BeforeEach
    void setUp() {
        activoId = UUID.randomUUID();
        responsableId = UUID.randomUUID();
        areaId = UUID.randomUUID();
        asignacionId = UUID.randomUUID();

        CategoriaActivo categoria = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Equipos")
                .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                .tasaDepreciacion(0.20)
                .build();

        area = Area.builder()
                .id(areaId)
                .codigo("TI-01")
                .nombre("TI")
                .build();

        activo = Activo.builder()
                .id(activoId)
                .codigo("EQ-001")
                .nombre("Laptop")
                .estado(EstadoActivo.ACTIVO)
                .categoria(categoria)
                .fechaAdquisicion(LocalDate.now())
                .valorAdquisicion(new BigDecimal("5000.00"))
                .vidaUtilAnios(5)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();

        responsable = Responsable.builder()
                .id(responsableId)
                .nombre("Juan Pérez")
                .cargo("Jefe TI")
                .email("juan@test.com")
                .build();

        asignacion = Asignacion.builder()
                .id(asignacionId)
                .activo(activo)
                .responsable(responsable)
                .area(area)
                .fechaAsignacion(LocalDate.now())
                .activa(true)
                .build();
    }

    @Test
    void asignar_activoDisponible_creaAsignacionYRegistraBlockchain() {
        AsignacionInput input = new AsignacionInput(activoId, responsableId, areaId, LocalDate.now(), "Asignación demo");

        when(activoService.findById(activoId)).thenReturn(activo);
        when(asignacionRepository.findByActivoIdAndActivaTrue(activoId)).thenReturn(Optional.empty());
        when(responsableRepository.findById(responsableId)).thenReturn(Optional.of(responsable));
        when(areaRepository.findById(areaId)).thenReturn(Optional.of(area));
        when(asignacionRepository.save(any(Asignacion.class))).thenAnswer(inv -> inv.getArgument(0));

        Asignacion result = asignacionService.asignar(input);

        assertThat(result.getActivo()).isEqualTo(activo);
        assertThat(result.getResponsable()).isEqualTo(responsable);
        assertThat(result.getActiva()).isTrue();
        verify(blockchainService).registrarTransaccion(activo, TipoTransaccionBlockchain.ASIGNACION);
        verify(ms3WebhookClient).notificarEvento(eq("ASIGNACION"), eq(activoId), anyString());
    }

    @Test
    void asignar_activoNoDisponible_lanzaExcepcion() {
        activo.setEstado(EstadoActivo.DADO_DE_BAJA);
        AsignacionInput input = new AsignacionInput(activoId, responsableId, areaId, LocalDate.now(), null);

        when(activoService.findById(activoId)).thenReturn(activo);

        assertThatThrownBy(() -> asignacionService.asignar(input))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no está disponible");
    }

    @Test
    void asignar_conAsignacionPreviaActiva_desactivaPreviaYCreaNewAsignacion() {
        Asignacion previa = Asignacion.builder()
                .id(UUID.randomUUID())
                .activo(activo)
                .responsable(responsable)
                .area(area)
                .fechaAsignacion(LocalDate.now().minusDays(30))
                .activa(true)
                .build();

        AsignacionInput input = new AsignacionInput(activoId, responsableId, areaId, LocalDate.now(), null);

        when(activoService.findById(activoId)).thenReturn(activo);
        when(asignacionRepository.findByActivoIdAndActivaTrue(activoId)).thenReturn(Optional.of(previa));
        when(asignacionRepository.save(previa)).thenReturn(previa);
        when(responsableRepository.findById(responsableId)).thenReturn(Optional.of(responsable));
        when(areaRepository.findById(areaId)).thenReturn(Optional.of(area));
        when(asignacionRepository.save(argThat(a -> a.getActiva() && a.getId() == null))).thenAnswer(inv -> inv.getArgument(0));

        asignacionService.asignar(input);

        assertThat(previa.getActiva()).isFalse();
    }

    @Test
    void devolver_asignacionActiva_laDesactiva() {
        when(asignacionRepository.findById(asignacionId)).thenReturn(Optional.of(asignacion));
        when(asignacionRepository.save(any(Asignacion.class))).thenAnswer(inv -> inv.getArgument(0));

        Asignacion result = asignacionService.devolver(asignacionId);

        assertThat(result.getActiva()).isFalse();
        assertThat(result.getFechaDevolucion()).isNotNull();
    }

    @Test
    void devolver_asignacionYaDevuelta_lanzaExcepcion() {
        asignacion.setActiva(false);
        when(asignacionRepository.findById(asignacionId)).thenReturn(Optional.of(asignacion));

        assertThatThrownBy(() -> asignacionService.devolver(asignacionId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ya fue devuelta");
    }

    @Test
    void findByActivo_retornaListaDeAsignaciones() {
        when(asignacionRepository.findByActivoId(activoId)).thenReturn(List.of(asignacion));

        List<Asignacion> result = asignacionService.findByActivo(activoId);

        assertThat(result).hasSize(1);
    }
}
