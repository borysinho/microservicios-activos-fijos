package com.activos.ms1.dto.input;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ActivoInput(
        @NotBlank
        @Size(max = 50)
        String codigo,
        @NotBlank
        @Size(max = 200)
        String nombre,
        @Size(max = 500)
        String descripcion,
        @NotNull
        LocalDate fechaAdquisicion,
        @NotNull
        @DecimalMin("0.01")
        BigDecimal valorAdquisicion,
        @NotNull
        @Min(1)
        @Max(100)
        Integer vidaUtilAnios,
        @NotNull
        UUID categoriaId,
        UUID areaActualId,
        @Size(max = 100)
        String ubicacion
        ) {

}
