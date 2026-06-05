package com.activos.ms1.dto.input;

import com.activos.ms1.entity.enums.EstadoActivo;
import java.util.UUID;

public record FiltroActivoInput(
        String codigo,
        String nombre,
        EstadoActivo estado,
        UUID categoriaId,
        UUID areaId,
        Integer anioAdquisicionDesde,
        Integer anioAdquisicionHasta
        ) {

}
