package com.activos.ms1.resolver;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import com.activos.ms1.dto.input.AsignacionInput;
import com.activos.ms1.entity.Asignacion;
import com.activos.ms1.service.AsignacionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class AsignacionResolver {

    private final AsignacionService asignacionService;

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Asignacion> asignacionesPorActivo(@Argument String activoId) {
        return asignacionService.findByActivo(UUID.fromString(activoId));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Asignacion> asignacionesPorResponsable(@Argument String responsableId) {
        return asignacionService.findByResponsable(UUID.fromString(responsableId));
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Asignacion asignarActivo(@Argument @Valid AsignacionInput input) {
        return asignacionService.asignar(input);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Asignacion devolverActivo(@Argument String asignacionId) {
        return asignacionService.devolver(UUID.fromString(asignacionId));
    }
}
