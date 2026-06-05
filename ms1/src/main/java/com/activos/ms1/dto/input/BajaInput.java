package com.activos.ms1.dto.input;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record BajaInput(
        @NotNull
        UUID activoId,
        @NotNull
        UUID autorizadoPorId,
        @NotBlank
        String motivo,
        BigDecimal valorResidual,
        String numeroResolucion
        ) {

}
