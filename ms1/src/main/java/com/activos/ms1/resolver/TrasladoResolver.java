package com.activos.ms1.resolver;

import com.activos.ms1.dto.input.TrasladoInput;
import com.activos.ms1.entity.Traslado;
import com.activos.ms1.service.TrasladoService;
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
public class TrasladoResolver {

    private final TrasladoService trasladoService;

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Traslado> trasladosPorActivo(@Argument String activoId) {
        return trasladoService.findByActivo(UUID.fromString(activoId));
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR')")
    public Traslado trasladarActivo(@Argument @Valid TrasladoInput input) {
        return trasladoService.trasladar(input);
    }

    @MutationMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESPONSABLE_AREA')")
    public Traslado confirmarRecepcionActivo(@Argument String trasladoId) {
        return trasladoService.confirmarRecepcion(UUID.fromString(trasladoId));
    }
}
