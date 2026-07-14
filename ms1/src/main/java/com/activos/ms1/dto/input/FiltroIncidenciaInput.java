package com.activos.ms1.dto.input;

import com.activos.ms1.entity.enums.EstadoIncidencia;
import com.activos.ms1.entity.enums.OrigenIncidencia;
import com.activos.ms1.entity.enums.PrioridadIncidencia;
import java.util.UUID;

public record FiltroIncidenciaInput(
        String busqueda,
        EstadoIncidencia estado,
        PrioridadIncidencia prioridad,
        OrigenIncidencia origen,
        UUID activoId,
        String area
        ) {

}
