package com.activos.ms1.dto.input;

import com.activos.ms1.entity.enums.EstadoIncidencia;
import com.activos.ms1.entity.enums.OrigenIncidencia;
import com.activos.ms1.entity.enums.PrioridadIncidencia;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record IncidenciaInput(
        @NotNull
        OrigenIncidencia origen,
        UUID activoId,
        @Size(max = 120)
        String notificacionId,
        @Size(max = 80)
        String codigoReferencia,
        @NotBlank
        @Size(max = 200)
        String titulo,
        @NotBlank
        @Size(max = 80)
        String tipo,
        @Size(max = 150)
        String area,
        @NotNull
        PrioridadIncidencia prioridad,
        EstadoIncidencia estado,
        @NotBlank
        @Size(max = 1000)
        String detalle,
        @Size(max = 150)
        String responsableOperativo,
        @Size(max = 1000)
        String diagnostico,
        @Size(max = 1000)
        String accionEjecutada,
        @Size(max = 500)
        String proximaAccion,
        LocalDate fechaCompromiso,
        UUID usuarioId
        ) {

}
