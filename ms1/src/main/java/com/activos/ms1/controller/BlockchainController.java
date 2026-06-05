package com.activos.ms1.controller;

import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.repository.ActivoRepository;
import com.activos.ms1.service.BlockchainService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Endpoint REST consumido por MS2 cuando un diagnóstico IA es crítico (CU-79).
 * MS2 envía el activoId y la descripción del diagnóstico; MS1 registra la
 * transacción en blockchain con tipo MANTENIMIENTO.
 */
@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
public class BlockchainController {

    private final BlockchainService blockchainService;
    private final ActivoRepository activoRepository;

    record DiagnosticoCriticoRequest(String activoId, String descripcionDiagnostico) {

    }

    @PostMapping("/diagnostico-critico")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> registrarDiagnosticoCritico(
            @RequestBody DiagnosticoCriticoRequest req) {

        var activo = activoRepository.findById(UUID.fromString(req.activoId()))
                .orElseThrow(() -> new NoSuchElementException(
                "Activo no encontrado: " + req.activoId()));

        var registro = blockchainService.registrarTransaccion(
                activo, TipoTransaccionBlockchain.MANTENIMIENTO);

        return ResponseEntity.ok(Map.of(
                "hash", registro.getHash(),
                "bloqueId", registro.getBloqueId() != null ? registro.getBloqueId() : "",
                "timestamp", registro.getTimestamp().toString(),
                "activoId", activo.getId().toString(),
                "activoCodigo", activo.getCodigo()
        ));
    }
}
