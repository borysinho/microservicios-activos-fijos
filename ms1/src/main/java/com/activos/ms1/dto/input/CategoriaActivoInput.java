package com.activos.ms1.dto.input;

import com.activos.ms1.entity.enums.MetodoDepreciacion;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoriaActivoInput(
        @NotBlank
        String nombre,
        String descripcion,
        @NotNull
        MetodoDepreciacion metodoDepreciacion,
        @NotNull
        @DecimalMin("0.01")
        @DecimalMax("1.0")
        Double tasaDepreciacion
        ) {

}
