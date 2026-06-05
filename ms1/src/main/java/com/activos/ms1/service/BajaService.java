package com.activos.ms1.service;

import com.activos.ms1.dto.input.BajaInput;
import com.activos.ms1.entity.Baja;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.ms3.MS3WebhookClient;
import com.activos.ms1.repository.BajaRepository;
import com.activos.ms1.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BajaService {

    private final BajaRepository bajaRepository;
    private final ActivoService activoService;
    private final UsuarioRepository usuarioRepository;
    private final BlockchainService blockchainService;
    private final MS3WebhookClient ms3WebhookClient;

    @Transactional
    public Baja darDeBaja(BajaInput input) {
        if (bajaRepository.existsByActivoId(input.activoId())) {
            throw new IllegalStateException("El activo ya tiene un registro de baja.");
        }

        var activo = activoService.findById(input.activoId());

        if (activo.getEstado() == EstadoActivo.DADO_DE_BAJA) {
            throw new IllegalStateException("El activo ya está dado de baja.");
        }

        var autorizadoPor = usuarioRepository.findById(input.autorizadoPorId())
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + input.autorizadoPorId()));

        var baja = Baja.builder()
                .activo(activo)
                .autorizadoPor(autorizadoPor)
                .fecha(LocalDate.now())
                .motivo(input.motivo())
                .valorResidual(input.valorResidual() != null ? input.valorResidual() : BigDecimal.ZERO)
                .numeroResolucion(input.numeroResolucion())
                .build();

        activoService.cambiarEstado(activo.getId(), EstadoActivo.DADO_DE_BAJA);

        var saved = bajaRepository.save(baja);
        blockchainService.registrarTransaccion(activo, TipoTransaccionBlockchain.BAJA);
        ms3WebhookClient.notificarEvento("BAJA", activo.getId(), activo.getCodigo());
        return saved;
    }

    public Baja findByActivo(UUID activoId) {
        return bajaRepository.findByActivoId(activoId)
                .orElseThrow(() -> new NoSuchElementException("No hay baja registrada para el activo: " + activoId));
    }
}
