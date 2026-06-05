package com.activos.ms1.service;

import com.activos.ms1.dto.input.ActivoInput;
import com.activos.ms1.dto.input.FiltroActivoInput;
import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.Area;
import com.activos.ms1.entity.CategoriaActivo;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.repository.ActivoRepository;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.AsignacionRepository;
import com.activos.ms1.repository.CategoriaActivoRepository;
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
class ActivoServiceTest {

    @Mock
    ActivoRepository activoRepository;
    @Mock
    CategoriaActivoRepository categoriaRepository;
    @Mock
    AreaRepository areaRepository;
    @Mock
    AsignacionRepository asignacionRepository;
    @Mock
    BlockchainService blockchainService;

    @InjectMocks
    ActivoService activoService;

    private CategoriaActivo categoria;
    private Area area;
    private Activo activo;
    private UUID activoId;

    @BeforeEach
    void setUp() {
        activoId = UUID.randomUUID();
        categoria = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Equipos")
                .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                .tasaDepreciacion(0.25)
                .build();
        area = Area.builder()
                .id(UUID.randomUUID())
                .codigo("TI-01")
                .nombre("TI")
                .build();
        activo = Activo.builder()
                .id(activoId)
                .codigo("EQ-001")
                .nombre("Laptop Dell")
                .fechaAdquisicion(LocalDate.of(2022, 1, 1))
                .valorAdquisicion(new BigDecimal("5000.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.ACTIVO)
                .categoria(categoria)
                .areaActual(area)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();
    }

    @Test
    void findAll_sinFiltro_retornaListaCompleta() {
        when(activoRepository.findAllActivos()).thenReturn(List.of(activo));

        List<Activo> result = activoService.findAll(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCodigo()).isEqualTo("EQ-001");
    }

    @Test
    void findAll_conFiltroEstado_filtraCorrectamente() {
        Activo activoBaja = Activo.builder()
                .id(UUID.randomUUID())
                .codigo("EQ-002")
                .nombre("PC Vieja")
                .estado(EstadoActivo.DADO_DE_BAJA)
                .categoria(categoria)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();
        when(activoRepository.findAll()).thenReturn(List.of(activo, activoBaja));

        FiltroActivoInput filtro = new FiltroActivoInput(null, null, EstadoActivo.ACTIVO, null, null, null, null);
        List<Activo> result = activoService.findAll(filtro);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEstado()).isEqualTo(EstadoActivo.ACTIVO);
    }

    @Test
    void findById_existente_retornaActivo() {
        when(activoRepository.findById(activoId)).thenReturn(Optional.of(activo));

        Activo result = activoService.findById(activoId);

        assertThat(result.getId()).isEqualTo(activoId);
    }

    @Test
    void findById_noExistente_lanzaExcepcion() {
        UUID randomId = UUID.randomUUID();
        when(activoRepository.findById(randomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> activoService.findById(randomId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Activo no encontrado");
    }

    @Test
    void registrar_codigoNuevo_guardaYRegistraBlockchain() {
        ActivoInput input = new ActivoInput(
                "EQ-NEW", "Nuevo Equipo", "Descripción",
                LocalDate.of(2024, 1, 1), new BigDecimal("3000.00"), 4,
                categoria.getId(), area.getId(), "Sala A");

        when(activoRepository.existsByCodigo("EQ-NEW")).thenReturn(false);
        when(categoriaRepository.findById(categoria.getId())).thenReturn(Optional.of(categoria));
        when(areaRepository.findById(area.getId())).thenReturn(Optional.of(area));
        when(activoRepository.save(any(Activo.class))).thenAnswer(inv -> inv.getArgument(0));

        Activo result = activoService.registrar(input);

        assertThat(result.getCodigo()).isEqualTo("EQ-NEW");
        assertThat(result.getEstado()).isEqualTo(EstadoActivo.ACTIVO);
        verify(blockchainService).registrarTransaccion(any(Activo.class), eq(TipoTransaccionBlockchain.REGISTRO));
    }

    @Test
    void registrar_codigoDuplicado_lanzaExcepcion() {
        ActivoInput input = new ActivoInput(
                "EQ-001", "Otro", null,
                LocalDate.now(), new BigDecimal("100"), 1,
                categoria.getId(), null, null);

        when(activoRepository.existsByCodigo("EQ-001")).thenReturn(true);

        assertThatThrownBy(() -> activoService.registrar(input))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ya existe un activo");
    }

    @Test
    void actualizar_cambiaDatos() {
        ActivoInput input = new ActivoInput(
                "EQ-001-MOD", "Laptop Dell Modificado", "Desc mod",
                LocalDate.of(2022, 1, 1), new BigDecimal("5500.00"), 6,
                categoria.getId(), null, "Sala B");

        when(activoRepository.findById(activoId)).thenReturn(Optional.of(activo));
        when(activoRepository.existsByCodigo("EQ-001-MOD")).thenReturn(false);
        when(categoriaRepository.findById(categoria.getId())).thenReturn(Optional.of(categoria));
        when(activoRepository.save(any(Activo.class))).thenAnswer(inv -> inv.getArgument(0));

        Activo result = activoService.actualizar(activoId, input);

        assertThat(result.getCodigo()).isEqualTo("EQ-001-MOD");
        assertThat(result.getNombre()).isEqualTo("Laptop Dell Modificado");
        assertThat(result.getVidaUtilAnios()).isEqualTo(6);
    }

    @Test
    void cambiarEstado_transicionValida_actualizaEstado() {
        when(activoRepository.findById(activoId)).thenReturn(Optional.of(activo));
        when(activoRepository.save(any(Activo.class))).thenAnswer(inv -> inv.getArgument(0));

        Activo result = activoService.cambiarEstado(activoId, EstadoActivo.EN_MANTENIMIENTO);

        assertThat(result.getEstado()).isEqualTo(EstadoActivo.EN_MANTENIMIENTO);
        verify(blockchainService).registrarTransaccion(any(Activo.class), eq(TipoTransaccionBlockchain.MANTENIMIENTO));
    }

    @Test
    void cambiarEstado_transicionInvalida_lanzaExcepcion() {
        activo.setEstado(EstadoActivo.DADO_DE_BAJA);
        when(activoRepository.findById(activoId)).thenReturn(Optional.of(activo));

        assertThatThrownBy(() -> activoService.cambiarEstado(activoId, EstadoActivo.ACTIVO))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Transición de estado inválida");
    }

    @Test
    void findByArea_retornaActivosDelArea() {
        when(activoRepository.findByAreaActualId(area.getId())).thenReturn(List.of(activo));

        List<Activo> result = activoService.findByArea(area.getId());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAreaActual().getId()).isEqualTo(area.getId());
    }
}
