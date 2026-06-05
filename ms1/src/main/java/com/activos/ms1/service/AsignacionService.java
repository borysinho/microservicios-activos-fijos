package com.activos.ms1.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.activos.ms1.dto.input.AsignacionInput;
import com.activos.ms1.entity.Asignacion;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.ms3.MS3WebhookClient;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.AsignacionRepository;
import com.activos.ms1.repository.ResponsableRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AsignacionService {

    private final AsignacionRepository asignacionRepository;
    private final ActivoService activoService;
    private final ResponsableRepository responsableRepository;
    private final AreaRepository areaRepository;
    private final BlockchainService blockchainService;
    private final MS3WebhookClient ms3WebhookClient;

    public List<Asignacion> findByActivo(UUID activoId) {
        return asignacionRepository.findByActivoId(activoId);
    }

    public List<Asignacion> findByResponsable(UUID responsableId) {
        return asignacionRepository.findByResponsableId(responsableId);
    }

    @Transactional
    public Asignacion asignar(AsignacionInput input) {
        var activo = activoService.findById(input.activoId());

        if (activo.getEstado() != EstadoActivo.ACTIVO) {
            throw new IllegalStateException(
                    "El activo no está disponible para asignación. Estado actual: " + activo.getEstado());
        }

        // Desactivar asignación previa si existe
        asignacionRepository.findByActivoIdAndActivaTrue(input.activoId())
                .ifPresent(prev -> {
                    prev.setActiva(false);
                    asignacionRepository.save(prev);
                });

        var responsable = responsableRepository.findById(input.responsableId())
                .orElseThrow(() -> new NoSuchElementException("Responsable no encontrado: " + input.responsableId()));

        var area = areaRepository.findById(input.areaId())
                .orElseThrow(() -> new NoSuchElementException("Área no encontrada: " + input.areaId()));

        var asignacion = Asignacion.builder()
                .activo(activo)
                .responsable(responsable)
                .area(area)
                .fechaAsignacion(input.fechaAsignacion())
                .observaciones(input.observaciones())
                .activa(true)
                .build();

        var saved = asignacionRepository.save(asignacion);
        blockchainService.registrarTransaccion(activo, TipoTransaccionBlockchain.ASIGNACION);
        ms3WebhookClient.notificarEvento("ASIGNACION", activo.getId(), activo.getCodigo());
        return saved;
    }

    @Transactional
    public Asignacion devolver(UUID asignacionId) {
        var asignacion = asignacionRepository.findById(asignacionId)
                .orElseThrow(() -> new NoSuchElementException("Asignación no encontrada: " + asignacionId));

        if (!asignacion.getActiva()) {
            throw new IllegalStateException("La asignación ya fue devuelta.");
        }

        asignacion.setActiva(false);
        asignacion.setFechaDevolucion(java.time.LocalDate.now());
        return asignacionRepository.save(asignacion);
    }
}
