package com.activos.ms1.dto.output;

import java.math.BigDecimal;
import java.util.List;

public record ReporteDepreciacionDTO(
        int anio,
        List<DetalleDepreciacionDTO> detalles,
        BigDecimal totalDepreciacionAnio,
        BigDecimal totalValorLibros
        ) {

    public record DetalleDepreciacionDTO(
            String activoCodigo,
            String activoNombre,
            String metodoDepreciacion,
            BigDecimal valorAdquisicion,
            BigDecimal depreciacionAcumulada,
            BigDecimal depreciacionAnio,
            BigDecimal valorLibros
    ) {
    }
}
