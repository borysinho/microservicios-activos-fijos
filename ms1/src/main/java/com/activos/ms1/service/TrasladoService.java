package com.activos.ms1.service;

import com.activos.ms1.dto.input.TrasladoInput;
import com.activos.ms1.entity.Traslado;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.ms3.MS3WebhookClient;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.TrasladoRepository;
import com.activos.ms1.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrasladoService {

    private final TrasladoRepository trasladoRepository;
    private final ActivoService activoService;
    private final AreaRepository areaRepository;
    private final UsuarioRepository usuarioRepository;
    private final BlockchainService blockchainService;
    private final MS3WebhookClient ms3WebhookClient;

    public List<Traslado> findByActivo(UUID activoId) {
        return trasladoRepository.findByActivoId(activoId);
    }

    @Transactional
    public Traslado trasladar(TrasladoInput input) {
        var activo = activoService.findById(input.activoId());

        if (activo.getEstado() == EstadoActivo.DADO_DE_BAJA) {
            throw new IllegalStateException("No se puede trasladar un activo dado de baja.");
        }

        var areaDestino = areaRepository.findById(input.areaDestinoId())
                .orElseThrow(() -> new NoSuchElementException("Área destino no encontrada: " + input.areaDestinoId()));

        var autorizadoPor = usuarioRepository.findById(input.autorizadoPorId())
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + input.autorizadoPorId()));

        var areaOrigen = activo.getAreaActual();
        if (areaOrigen == null) {
            throw new IllegalStateException("El activo no tiene área de origen asignada.");
        }

        if (areaOrigen.getId().equals(input.areaDestinoId())) {
            throw new IllegalArgumentException("El área destino debe ser diferente al área origen.");
        }

        var traslado = Traslado.builder()
                .activo(activo)
                .areaOrigen(areaOrigen)
                .areaDestino(areaDestino)
                .autorizadoPor(autorizadoPor)
                .fecha(input.fecha())
                .motivoTraslado(input.motivoTraslado())
                .recepcionConfirmada(false)
                .build();

        activoService.cambiarEstado(activo.getId(), EstadoActivo.TRANSFERIDO);

        var saved = trasladoRepository.save(traslado);
        blockchainService.registrarTransaccion(activo, TipoTransaccionBlockchain.TRASLADO);
        ms3WebhookClient.notificarEvento("TRASLADO", activo.getId(), activo.getCodigo());
        return saved;
    }

    @Transactional
    public Traslado confirmarRecepcion(UUID trasladoId) {
        var traslado = trasladoRepository.findById(trasladoId)
                .orElseThrow(() -> new NoSuchElementException("Traslado no encontrado: " + trasladoId));

        traslado.setRecepcionConfirmada(true);
        traslado.getActivo().setAreaActual(traslado.getAreaDestino());
        activoService.cambiarEstado(traslado.getActivo().getId(), EstadoActivo.ACTIVO);

        return trasladoRepository.save(traslado);
    }
}
