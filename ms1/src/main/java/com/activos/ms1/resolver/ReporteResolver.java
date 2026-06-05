package com.activos.ms1.resolver;

import com.activos.ms1.dto.output.DashboardMetricasDTO;
import com.activos.ms1.dto.output.ProyeccionVidaUtilDTO;
import com.activos.ms1.dto.output.ReporteDepreciacionDTO;
import com.activos.ms1.entity.RegistroBlockchain;
import com.activos.ms1.service.BlockchainService;
import com.activos.ms1.service.DashboardService;
import com.activos.ms1.service.DepreciacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ReporteResolver {

    private final DepreciacionService depreciacionService;
    private final DashboardService dashboardService;
    private final BlockchainService blockchainService;

    @QueryMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR')")
    public ReporteDepreciacionDTO reporteDepreciacion(@Argument int anio) {
        return depreciacionService.generarReporte(anio);
    }

    @QueryMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR')")
    public DashboardMetricasDTO dashboardBI() {
        return dashboardService.obtenerMetricas();
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public ProyeccionVidaUtilDTO proyectarVidaUtil(@Argument String activoId) {
        return depreciacionService.proyectarVidaUtil(UUID.fromString(activoId));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public boolean verificarIntegridadBlockchain(@Argument String registroId) {
        return blockchainService.verificarIntegridad(UUID.fromString(registroId));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<RegistroBlockchain> historialBlockchain(@Argument String activoId) {
        return blockchainService.obtenerHistorial(UUID.fromString(activoId));
    }
}
