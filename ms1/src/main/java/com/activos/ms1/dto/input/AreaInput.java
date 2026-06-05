package com.activos.ms1.dto.input;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AreaInput(
        @NotBlank
        String codigo,
        @NotBlank
        String nombre,
        String descripcion,
        UUID responsableId
        ) {

}
