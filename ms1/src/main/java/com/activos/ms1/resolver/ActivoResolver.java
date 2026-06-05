package com.activos.ms1.resolver;

import com.activos.ms1.dto.input.ActivoInput;
import com.activos.ms1.dto.input.FiltroActivoInput;
import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.service.ActivoService;
import com.activos.ms1.service.DepreciacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ActivoResolver {

    private final ActivoService activoService;
    private final DepreciacionService depreciacionService;

    @SchemaMapping(typeName = "Activo", field = "valorLibros")
    public BigDecimal valorLibros(Activo activo) {
        return depreciacionService.calcularValorLibros(activo);
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Activo> activos(@Argument FiltroActivoInput filtro) {
        return activoService.findAll(filtro);
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public Activo activo(@Argument String id) {
        return activoService.findById(UUID.fromString(id));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Activo> activosPorArea(@Argument String areaId) {
        return activoService.findByArea(UUID.fromString(areaId));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Activo> activosPorResponsable(@Argument String responsableId) {
        return activoService.findByResponsable(UUID.fromString(responsableId));
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR')")
    public Activo registrarActivo(@Argument @Valid ActivoInput input) {
        return activoService.registrar(input);
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR')")
    public Activo actualizarActivo(@Argument String id, @Argument @Valid ActivoInput input) {
        return activoService.actualizar(UUID.fromString(id), input);
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESPONSABLE_AREA')")
    public Activo cambiarEstadoActivo(@Argument String activoId, @Argument EstadoActivo nuevoEstado) {
        return activoService.cambiarEstado(UUID.fromString(activoId), nuevoEstado);
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESPONSABLE_AREA')")
    public Activo actualizarUbicacionActivo(@Argument String activoId, @Argument String ubicacion) {
        return activoService.actualizarUbicacion(UUID.fromString(activoId), ubicacion);
    }
}
