package com.activos.ms1.resolver;

import com.activos.ms1.dto.input.BajaInput;
import com.activos.ms1.entity.Baja;
import com.activos.ms1.service.BajaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class BajaResolver {

    private final BajaService bajaService;

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public Baja bajaPorActivo(@Argument String activoId) {
        return bajaService.findByActivo(UUID.fromString(activoId));
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Baja darDeBajaActivo(@Argument @Valid BajaInput input) {
        return bajaService.darDeBaja(input);
    }
}
