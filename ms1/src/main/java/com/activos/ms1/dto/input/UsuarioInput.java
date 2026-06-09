package com.activos.ms1.dto.input;

import com.activos.ms1.entity.enums.RolUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UsuarioInput(
        @NotBlank
        @Size(min = 3, max = 80)
        String username,
        @NotBlank
        @Email
        String email,
        @Size(min = 6)
        String password,
        @NotNull
        RolUsuario rol
        ) {

}
