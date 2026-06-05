package com.activos.ms1.dto.output;

import java.math.BigDecimal;
import java.util.UUID;

public record ProyeccionVidaUtilDTO(
        UUID activoId,
        String activoCodigo,
        String activoNombre,
        int vidaUtilAnios,
        int aniosTranscurridos,
        int aniosRestantes,
        int mesesRestantes,
        double porcentajeDepreciado,
        BigDecimal valorLibros,
        boolean estaDepreciadoCompletamente
        ) {

}
