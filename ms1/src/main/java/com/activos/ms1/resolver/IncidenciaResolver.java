package com.activos.ms1.resolver;

import com.activos.ms1.dto.input.FiltroIncidenciaInput;
import com.activos.ms1.dto.input.IncidenciaGestionInput;
import com.activos.ms1.dto.input.IncidenciaInput;
import com.activos.ms1.entity.Incidencia;
import com.activos.ms1.service.IncidenciaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class IncidenciaResolver {

    private final IncidenciaService incidenciaService;

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Incidencia> incidencias(@Argument FiltroIncidenciaInput filtro) {
        return incidenciaService.findAll(filtro);
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Incidencia> incidenciasAbiertas() {
        return incidenciaService.abiertas();
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public Incidencia incidencia(@Argument String id) {
        return incidenciaService.findById(UUID.fromString(id));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Incidencia> incidenciasPorActivo(@Argument String activoId) {
        return incidenciaService.findByActivo(UUID.fromString(activoId));
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESPONSABLE_AREA')")
    public Incidencia sincronizarIncidencia(@Argument @Valid IncidenciaInput input) {
        return incidenciaService.sincronizar(input);
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESPONSABLE_AREA')")
    public Incidencia actualizarIncidencia(
            @Argument String id,
            @Argument @Valid IncidenciaGestionInput input) {
        return incidenciaService.actualizar(UUID.fromString(id), input);
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESPONSABLE_AREA')")
    public Incidencia cerrarIncidencia(
            @Argument String id,
            @Argument @Valid IncidenciaGestionInput input) {
        return incidenciaService.cerrar(UUID.fromString(id), input);
    }
}
