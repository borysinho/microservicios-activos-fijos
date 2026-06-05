package com.activos.ms1.dto.input;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record TrasladoInput(
        @NotNull
        UUID activoId,
        @NotNull
        UUID areaDestinoId,
        @NotNull
        UUID autorizadoPorId,
        @NotNull
        LocalDate fecha,
        @NotBlank
        String motivoTraslado
        ) {

}
