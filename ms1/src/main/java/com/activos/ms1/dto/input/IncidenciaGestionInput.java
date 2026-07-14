package com.activos.ms1.dto.input;

import com.activos.ms1.entity.enums.EstadoIncidencia;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record IncidenciaGestionInput(
        EstadoIncidencia estado,
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
