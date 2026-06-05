package com.activos.ms1.dto.input;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResponsableInput(
        @NotBlank
        String nombre,
        @NotBlank
        String cargo,
        @NotBlank
        @Email
        String email,
        String telefono
        ) {

}
