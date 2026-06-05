package com.activos.ms1.dto.input;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record AsignacionInput(
        @NotNull
        UUID activoId,
        @NotNull
        UUID responsableId,
        @NotNull
        UUID areaId,
        @NotNull
        LocalDate fechaAsignacion,
        String observaciones
        ) {

}
