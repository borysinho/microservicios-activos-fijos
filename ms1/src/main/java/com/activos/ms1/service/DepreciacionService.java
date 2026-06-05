package com.activos.ms1.service;

import com.activos.ms1.dto.output.ProyeccionVidaUtilDTO;
import com.activos.ms1.dto.output.ReporteDepreciacionDTO;
import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.CategoriaActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.repository.ActivoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepreciacionService {

    private final ActivoRepository activoRepository;

    public BigDecimal calcularValorLibros(Activo activo) {
        int aniosTranscurridos = Math.max(0,
                LocalDate.now().getYear() - activo.getFechaAdquisicion().getYear());
        return activo.getValorAdquisicion()
                .subtract(calcularDepreciacionActivo(activo, aniosTranscurridos))
                .max(BigDecimal.ZERO);
    }

    public ProyeccionVidaUtilDTO proyectarVidaUtil(UUID activoId) {
        var activo = activoRepository.findById(activoId)
                .orElseThrow(() -> new NoSuchElementException("Activo no encontrado: " + activoId));

        int aniosTranscurridos = Math.max(0,
                LocalDate.now().getYear() - activo.getFechaAdquisicion().getYear());
        int aniosRestantes = Math.max(0, activo.getVidaUtilAnios() - aniosTranscurridos);
        int mesesRestantes = aniosRestantes * 12;

        var depreciacionAcumulada = calcularDepreciacionActivo(activo, aniosTranscurridos);
        var valorLibros = activo.getValorAdquisicion()
                .subtract(depreciacionAcumulada)
                .max(BigDecimal.ZERO);

        double porcentajeDepreciado = activo.getValorAdquisicion().compareTo(BigDecimal.ZERO) > 0
                ? Math.min(100.0,
                        depreciacionAcumulada.doubleValue()
                        / activo.getValorAdquisicion().doubleValue() * 100)
                : 100.0;

        return new ProyeccionVidaUtilDTO(
                activo.getId(),
                activo.getCodigo(),
                activo.getNombre(),
                activo.getVidaUtilAnios(),
                aniosTranscurridos,
                aniosRestantes,
                mesesRestantes,
                Math.round(porcentajeDepreciado * 100.0) / 100.0,
                valorLibros,
                aniosRestantes == 0
        );
    }

    public ReporteDepreciacionDTO generarReporte(int anio) {
        var activos = activoRepository.findAllActivos();

        var detalles = activos.stream()
                .map(a -> calcularDetalle(a, anio))
                .toList();

        var totalDepreciacionAnio = detalles.stream()
                .map(ReporteDepreciacionDTO.DetalleDepreciacionDTO::depreciacionAnio)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        var totalValorLibros = detalles.stream()
                .map(ReporteDepreciacionDTO.DetalleDepreciacionDTO::valorLibros)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ReporteDepreciacionDTO(anio, detalles, totalDepreciacionAnio, totalValorLibros);
    }

    public BigDecimal calcularDepreciacionActivo(Activo activo, int aniosTranscurridos) {
        return switch (activo.getCategoria().getMetodoDepreciacion()) {
            case LINEAL ->
                calcularLineal(activo, aniosTranscurridos);
            case ACELERADO ->
                calcularAcelerado(activo, aniosTranscurridos);
            case SUMA_DIGITOS ->
                calcularSumaDigitos(activo, aniosTranscurridos);
        };
    }

    private ReporteDepreciacionDTO.DetalleDepreciacionDTO calcularDetalle(Activo activo, int anio) {
        int aniosTranscurridos = anio - activo.getFechaAdquisicion().getYear();
        if (aniosTranscurridos < 0) {
            aniosTranscurridos = 0;
        }

        var depreciacionAcumulada = calcularDepreciacionActivo(activo, aniosTranscurridos);
        var depreciacionAnio = calcularDepreciacionActivo(activo, 1);
        var valorLibros = activo.getValorAdquisicion().subtract(depreciacionAcumulada)
                .max(BigDecimal.ZERO);

        return new ReporteDepreciacionDTO.DetalleDepreciacionDTO(
                activo.getCodigo(),
                activo.getNombre(),
                activo.getCategoria().getMetodoDepreciacion().name(),
                activo.getValorAdquisicion(),
                depreciacionAcumulada,
                depreciacionAnio,
                valorLibros
        );
    }

    // Depreciación lineal: valor / vida útil × años
    private BigDecimal calcularLineal(Activo activo, int anios) {
        return activo.getValorAdquisicion()
                .divide(BigDecimal.valueOf(activo.getVidaUtilAnios()), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(Math.min(anios, activo.getVidaUtilAnios())))
                .setScale(2, RoundingMode.HALF_UP);
    }

    // Depreciación acelerada (doble saldo decreciente)
    private BigDecimal calcularAcelerado(Activo activo, int anios) {
        double tasa = 2.0 / activo.getVidaUtilAnios();
        double valorLibros = activo.getValorAdquisicion().doubleValue();
        double depreciacionAcumulada = 0;

        for (int i = 0; i < Math.min(anios, activo.getVidaUtilAnios()); i++) {
            double dep = valorLibros * tasa;
            depreciacionAcumulada += dep;
            valorLibros -= dep;
        }

        return BigDecimal.valueOf(depreciacionAcumulada).setScale(2, RoundingMode.HALF_UP);
    }

    // Suma de dígitos de los años
    private BigDecimal calcularSumaDigitos(Activo activo, int anios) {
        int n = activo.getVidaUtilAnios();
        int sumaTotal = n * (n + 1) / 2;
        double depreciacion = 0;

        for (int i = 0; i < Math.min(anios, n); i++) {
            depreciacion += ((double) (n - i) / sumaTotal) * activo.getValorAdquisicion().doubleValue();
        }

        return BigDecimal.valueOf(depreciacion).setScale(2, RoundingMode.HALF_UP);
    }
}
