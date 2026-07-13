package com.activos.ms1.service;

import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.Area;
import com.activos.ms1.entity.CategoriaActivo;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.repository.ActivoRepository;
import com.activos.ms1.repository.AsignacionRepository;
import com.activos.ms1.repository.TrasladoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    ActivoRepository activoRepository;
    @Mock
    AsignacionRepository asignacionRepository;
    @Mock
    TrasladoRepository trasladoRepository;
    @Mock
    DepreciacionService depreciacionService;

    @InjectMocks
    DashboardService dashboardService;

    @Test
    void obtenerMetricas_usuarioDashboard_retornaIndicadores() {
        var fechaAdquisicion = LocalDate.now().minusYears(2);
        var categoria = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Equipos")
                .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                .build();
        var area = Area.builder()
                .id(UUID.randomUUID())
                .nombre("TI")
                .build();
        var activo = Activo.builder()
                .id(UUID.randomUUID())
                .codigo("EQ-001")
                .nombre("Laptop")
                .fechaAdquisicion(fechaAdquisicion)
                .valorAdquisicion(new BigDecimal("6000.00"))
                .vidaUtilAnios(4)
                .estado(EstadoActivo.ACTIVO)
                .categoria(categoria)
                .areaActual(area)
                .build();

        when(activoRepository.findAll()).thenReturn(List.of(activo));
        when(activoRepository.countByEstado(EstadoActivo.ACTIVO)).thenReturn(1L);
        when(depreciacionService.calcularDepreciacionActivo(activo, 2))
                .thenReturn(new BigDecimal("3000.00"));
        when(asignacionRepository.findByActivaTrue()).thenReturn(List.of());
        when(trasladoRepository.findByRecepcionConfirmadaFalse()).thenReturn(List.of());

        var metricas = dashboardService.obtenerMetricas();

        assertThat(metricas.totalActivos()).isEqualTo(1);
        assertThat(metricas.activosActivos()).isEqualTo(1);
        assertThat(metricas.valorTotalInventario()).isEqualByComparingTo("6000.00");
        assertThat(metricas.depreciacionAcumuladaTotal()).isEqualByComparingTo("3000.00");
        assertThat(metricas.activosPorCategoria()).extracting("categoria").containsExactly("Equipos");
        assertThat(metricas.activosPorArea()).extracting("area").containsExactly("TI");
        assertThat(metricas.adquisicionesPorAnio()).extracting("anio")
                .containsExactly(fechaAdquisicion.getYear());
    }

    @Test
    void obtenerMetricas_activoConDatosContablesIncompletos_noRompeDashboard() {
        var activo = Activo.builder()
                .id(UUID.randomUUID())
                .codigo("EQ-002")
                .nombre("Activo incompleto")
                .estado(EstadoActivo.ACTIVO)
                .build();

        when(activoRepository.findAll()).thenReturn(List.of(activo));
        when(activoRepository.countByEstado(EstadoActivo.ACTIVO)).thenReturn(1L);
        when(asignacionRepository.findByActivaTrue()).thenReturn(List.of());
        when(trasladoRepository.findByRecepcionConfirmadaFalse()).thenReturn(List.of());

        var metricas = dashboardService.obtenerMetricas();

        assertThat(metricas.totalActivos()).isEqualTo(1);
        assertThat(metricas.valorTotalInventario()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(metricas.depreciacionAcumuladaTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(metricas.activosPorCategoria()).extracting("categoria").containsExactly("Sin categoría");
        assertThat(metricas.activosPorArea()).isEmpty();
        verifyNoInteractions(depreciacionService);
    }
}
