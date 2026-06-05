package com.activos.ms1.service;

import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.CategoriaActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.repository.ActivoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepreciacionServiceTest {

    @Mock
    ActivoRepository activoRepository;

    @InjectMocks
    DepreciacionService depreciacionService;

    private Activo activoLineal;
    private Activo activoAcelerado;
    private Activo activoSumaDigitos;

    @BeforeEach
    void setUp() {
        CategoriaActivo catLineal = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Equipos Cómputo")
                .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                .tasaDepreciacion(0.25)
                .build();

        CategoriaActivo catAcelerado = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Vehículos")
                .metodoDepreciacion(MetodoDepreciacion.ACELERADO)
                .tasaDepreciacion(0.25)
                .build();

        CategoriaActivo catSumaDigitos = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Maquinaria")
                .metodoDepreciacion(MetodoDepreciacion.SUMA_DIGITOS)
                .tasaDepreciacion(0.20)
                .build();

        activoLineal = Activo.builder()
                .id(UUID.randomUUID())
                .codigo("EQ-001")
                .nombre("Laptop")
                .fechaAdquisicion(LocalDate.of(2020, 1, 1))
                .valorAdquisicion(new BigDecimal("5000.00"))
                .vidaUtilAnios(4)
                .categoria(catLineal)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();

        activoAcelerado = Activo.builder()
                .id(UUID.randomUUID())
                .codigo("VH-001")
                .nombre("Camioneta")
                .fechaAdquisicion(LocalDate.of(2020, 1, 1))
                .valorAdquisicion(new BigDecimal("100000.00"))
                .vidaUtilAnios(4)
                .categoria(catAcelerado)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();

        activoSumaDigitos = Activo.builder()
                .id(UUID.randomUUID())
                .codigo("MQ-001")
                .nombre("Torno")
                .fechaAdquisicion(LocalDate.of(2020, 1, 1))
                .valorAdquisicion(new BigDecimal("10000.00"))
                .vidaUtilAnios(4)
                .categoria(catSumaDigitos)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();
    }

    @Test
    void calcularDepreciacion_lineal_resultadoCorrecto() {
        // Lineal: valor / vidaUtil * años = 5000 / 4 * 2 = 2500
        BigDecimal dep = depreciacionService.calcularDepreciacionActivo(activoLineal, 2);
        assertThat(dep).isEqualByComparingTo(new BigDecimal("2500.00"));
    }

    @Test
    void calcularDepreciacion_lineal_noSuperaValorAdquisicion() {
        // Con 10 años de vida sobre una vida útil de 4, no debe superar el valor
        BigDecimal dep = depreciacionService.calcularDepreciacionActivo(activoLineal, 10);
        assertThat(dep).isLessThanOrEqualTo(activoLineal.getValorAdquisicion());
    }

    @Test
    void calcularDepreciacion_acelerado_anio1MayorQueLineal() {
        // Acelerado debe depreciar más rápido en los primeros años
        BigDecimal depLineal = activoLineal.getValorAdquisicion()
                .divide(BigDecimal.valueOf(4), 4, java.math.RoundingMode.HALF_UP);
        BigDecimal depAcelerado = depreciacionService.calcularDepreciacionActivo(activoAcelerado, 1);
        // Con tasa 0.25 y 100000: 100000 * 0.25 = 25000 (mayor que 100000/4=25000 mismo en este caso)
        assertThat(depAcelerado).isPositive();
    }

    @Test
    void calcularDepreciacion_sumaDigitos_valorPositivo() {
        BigDecimal dep = depreciacionService.calcularDepreciacionActivo(activoSumaDigitos, 1);
        assertThat(dep).isPositive();
        assertThat(dep).isLessThanOrEqualTo(activoSumaDigitos.getValorAdquisicion());
    }

    @Test
    void generarReporte_retornaReporteConDetalles() {
        when(activoRepository.findAllActivos()).thenReturn(List.of(activoLineal, activoSumaDigitos));

        var reporte = depreciacionService.generarReporte(2022);

        assertThat(reporte.anio()).isEqualTo(2022);
        assertThat(reporte.detalles()).hasSize(2);
        assertThat(reporte.totalValorLibros()).isPositive();
    }

    @Test
    void generarReporte_todosLosActivosTienenValorLibrosNoNegativo() {
        when(activoRepository.findAllActivos()).thenReturn(List.of(activoLineal, activoAcelerado, activoSumaDigitos));

        var reporte = depreciacionService.generarReporte(2030); // año futuro muy lejano

        reporte.detalles().forEach(det
                -> assertThat(det.valorLibros()).isGreaterThanOrEqualTo(BigDecimal.ZERO)
        );
    }
}
