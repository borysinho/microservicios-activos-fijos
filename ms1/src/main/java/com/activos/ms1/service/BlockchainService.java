package com.activos.ms1.service;

import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.RegistroBlockchain;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.blockchain.BlockchainAdapter;
import com.activos.ms1.repository.RegistroBlockchainRepository;
import tools.jackson.core.exc.JacksonIOException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlockchainService {

    private final BlockchainAdapter blockchainAdapter;
    private final RegistroBlockchainRepository registroRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public RegistroBlockchain registrarTransaccion(Activo activo, TipoTransaccionBlockchain tipo) {
        var payload = buildPayload(activo, tipo);

        String hash;
        String bloqueId;
        try {
            var resultado = blockchainAdapter.registrar(payload);
            hash = resultado.hash();
            bloqueId = resultado.bloqueId();
        } catch (Exception e) {
            log.error("Error al registrar en blockchain para activo {}: {}", activo.getId(), e.getMessage());
            hash = generarHashLocal(payload);
            bloqueId = "LOCAL-" + UUID.randomUUID();
        }

        var registro = RegistroBlockchain.builder()
                .activo(activo)
                .hash(hash)
                .tipoTransaccion(tipo)
                .payload(payload)
                .bloqueId(bloqueId)
                .timestamp(LocalDateTime.now())
                .build();

        return registroRepository.save(registro);
    }

    public List<RegistroBlockchain> obtenerHistorial(UUID activoId) {
        return registroRepository.findByActivoIdOrderByTimestampDesc(activoId);
    }

    public boolean verificarIntegridad(UUID registroId) {
        var registro = registroRepository.findById(registroId)
                .orElseThrow(() -> new NoSuchElementException(
                "Registro blockchain no encontrado: " + registroId));
        try {
            @SuppressWarnings("unchecked")
            var payloadMap = objectMapper.readValue(registro.getPayload(), Map.class);
            String payloadActivoId = (String) payloadMap.get("activoId");
            String payloadCodigo = (String) payloadMap.get("codigo");
            boolean referenciaActivoValida = (payloadActivoId != null
                    && payloadActivoId.equals(registro.getActivo().getId().toString()))
                    || (payloadCodigo != null
                    && payloadCodigo.equals(registro.getActivo().getCodigo()));

            return referenciaActivoValida
                    && registro.getHash() != null
                    && registro.getHash().startsWith("0x")
                    && registro.getHash().length() >= 10
                    && registro.getPayload() != null
                    && !registro.getPayload().isBlank();
        } catch (Exception e) {
            log.warn("Error verificando integridad del registro {}: {}", registroId, e.getMessage());
            return false;
        }
    }

    private String buildPayload(Activo activo, TipoTransaccionBlockchain tipo) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "activoId", activo.getId().toString(),
                    "codigo", activo.getCodigo(),
                    "tipo", tipo.name(),
                    "estado", activo.getEstado().name(),
                    "timestamp", LocalDateTime.now().toString()
            ));
        } catch (JacksonIOException e) {
            return "{\"activoId\":\"%s\",\"tipo\":\"%s\"}".formatted(activo.getId(), tipo.name());
        }
    }

    private String generarHashLocal(String payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return "0x" + HexFormat.of().formatHex(digest.digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return "0x" + UUID.nameUUIDFromBytes(payload.getBytes(StandardCharsets.UTF_8)).toString().replace("-", "")
                    + UUID.nameUUIDFromBytes(("fallback:" + payload).getBytes(StandardCharsets.UTF_8)).toString().replace("-", "");
        }
    }
}
