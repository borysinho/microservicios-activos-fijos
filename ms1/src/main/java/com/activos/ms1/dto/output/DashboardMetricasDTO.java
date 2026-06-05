package com.activos.ms1.dto.output;

import java.math.BigDecimal;
import java.util.List;

public record DashboardMetricasDTO(
        long totalActivos,
        long activosActivos,
        long activosEnMantenimiento,
        long activosTransferidos,
        long activosDadoDeBaja,
        BigDecimal valorTotalInventario,
        BigDecimal depreciacionAcumuladaTotal,
        List<ParCategoriaConteo> activosPorCategoria,
        List<ParAreaConteo> activosPorArea,
        long asignacionesActivas,
        long trasladosPendientes,
        List<ParAnioConteo> adquisicionesPorAnio
        ) {

}
