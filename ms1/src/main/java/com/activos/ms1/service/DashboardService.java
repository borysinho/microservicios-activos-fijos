package com.activos.ms1.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.activos.ms1.dto.output.DashboardMetricasDTO;
import com.activos.ms1.dto.output.ParAnioConteo;
import com.activos.ms1.dto.output.ParAreaConteo;
import com.activos.ms1.dto.output.ParCategoriaConteo;
import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.repository.ActivoRepository;
import com.activos.ms1.repository.AsignacionRepository;
import com.activos.ms1.repository.TrasladoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ActivoRepository activoRepository;
    private final AsignacionRepository asignacionRepository;
    private final TrasladoRepository trasladoRepository;
    private final DepreciacionService depreciacionService;

    public DashboardMetricasDTO obtenerMetricas() {
        var todosActivos = activoRepository.findAll();

        var valorTotal = todosActivos.stream()
                .map(a -> a.getValorAdquisicion() != null ? a.getValorAdquisicion() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        var depreciacionTotal = todosActivos.stream()
                .map(this::calcularDepreciacionAcumulada)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ParCategoriaConteo> porCategoria = todosActivos.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCategoria() != null ? a.getCategoria().getNombre() : "Sin categoría",
                        Collectors.counting()
                ))
                .entrySet().stream()
                .map(e -> new ParCategoriaConteo(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        List<ParAreaConteo> porArea = todosActivos.stream()
                .filter(a -> a.getAreaActual() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getAreaActual().getNombre(),
                        Collectors.counting()
                ))
                .entrySet().stream()
                .map(e -> new ParAreaConteo(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        List<ParAnioConteo> adquisicionesPorAnio = todosActivos.stream()
                .filter(a -> a.getFechaAdquisicion() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getFechaAdquisicion().getYear(),
                        Collectors.counting()
                ))
                .entrySet().stream()
                .sorted(java.util.Map.Entry.comparingByKey())
                .map(e -> new ParAnioConteo(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        return new DashboardMetricasDTO(
                todosActivos.size(),
                activoRepository.countByEstado(EstadoActivo.ACTIVO),
                activoRepository.countByEstado(EstadoActivo.EN_MANTENIMIENTO),
                activoRepository.countByEstado(EstadoActivo.TRANSFERIDO),
                activoRepository.countByEstado(EstadoActivo.DADO_DE_BAJA),
                valorTotal,
                depreciacionTotal,
                porCategoria,
                porArea,
                asignacionRepository.findByActivaTrue().size(),
                trasladoRepository.findByRecepcionConfirmadaFalse().size(),
                adquisicionesPorAnio
        );
    }

    private BigDecimal calcularDepreciacionAcumulada(Activo activo) {
        if (activo.getFechaAdquisicion() == null
                || activo.getValorAdquisicion() == null
                || activo.getCategoria() == null
                || activo.getCategoria().getMetodoDepreciacion() == null
                || activo.getVidaUtilAnios() == null
                || activo.getVidaUtilAnios() <= 0) {
            return BigDecimal.ZERO;
        }

        int aniosTranscurridos = LocalDate.now().getYear() - activo.getFechaAdquisicion().getYear();
        return depreciacionService.calcularDepreciacionActivo(activo, Math.max(aniosTranscurridos, 0));
    }
}
