package com.activos.ms1.service;

import com.activos.ms1.dto.input.FiltroIncidenciaInput;
import com.activos.ms1.dto.input.IncidenciaGestionInput;
import com.activos.ms1.dto.input.IncidenciaInput;
import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.Incidencia;
import com.activos.ms1.entity.Usuario;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.EstadoIncidencia;
import com.activos.ms1.entity.enums.OrigenIncidencia;
import com.activos.ms1.repository.ActivoRepository;
import com.activos.ms1.repository.IncidenciaRepository;
import com.activos.ms1.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidenciaService {

    private static final List<EstadoIncidencia> ESTADOS_ABIERTOS = List.of(
            EstadoIncidencia.NUEVA,
            EstadoIncidencia.ABIERTA,
            EstadoIncidencia.EN_PROCESO);

    private final IncidenciaRepository incidenciaRepository;
    private final ActivoRepository activoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ActivoService activoService;

    public List<Incidencia> findAll(FiltroIncidenciaInput filtro) {
        return incidenciaRepository.findAll().stream()
                .filter(i -> filtro == null || filtro.estado() == null || i.getEstado() == filtro.estado())
                .filter(i -> filtro == null || filtro.prioridad() == null || i.getPrioridad() == filtro.prioridad())
                .filter(i -> filtro == null || filtro.origen() == null || i.getOrigen() == filtro.origen())
                .filter(i -> filtro == null || filtro.activoId() == null
                        || (i.getActivo() != null && i.getActivo().getId().equals(filtro.activoId())))
                .filter(i -> filtro == null || esVacio(filtro.area()) || contiene(i.getArea(), filtro.area()))
                .filter(i -> filtro == null || esVacio(filtro.busqueda()) || coincideBusqueda(i, filtro.busqueda()))
                .sorted((a, b) -> b.getFechaCreacion().compareTo(a.getFechaCreacion()))
                .toList();
    }

    public List<Incidencia> abiertas() {
        return incidenciaRepository.findByEstadoInOrderByFechaCreacionDesc(ESTADOS_ABIERTOS);
    }

    public Incidencia findById(UUID id) {
        return incidenciaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Incidencia no encontrada: " + id));
    }

    public List<Incidencia> findByActivo(UUID activoId) {
        return incidenciaRepository.findByActivoIdOrderByFechaCreacionDesc(activoId);
    }

    @Transactional
    public Incidencia sincronizar(IncidenciaInput input) {
        var existente = buscarExistente(input);
        if (existente != null) {
            actualizarDatosFuente(existente, input);
            return incidenciaRepository.save(existente);
        }

        Activo activo = cargarActivo(input.activoId());
        var incidencia = Incidencia.builder()
                .origen(input.origen())
                .activo(activo)
                .notificacionId(limpiar(input.notificacionId()))
                .codigoReferencia(codigoReferencia(input, activo))
                .titulo(input.titulo().trim())
                .tipo(input.tipo().trim())
                .area(area(input, activo))
                .prioridad(input.prioridad())
                .estado(input.estado() != null ? input.estado() : estadoInicial(input.origen()))
                .detalle(input.detalle().trim())
                .responsableOperativo(limpiar(input.responsableOperativo()))
                .diagnostico(limpiar(input.diagnostico()))
                .accionEjecutada(limpiar(input.accionEjecutada()))
                .proximaAccion(limpiar(input.proximaAccion()))
                .fechaCompromiso(input.fechaCompromiso())
                .creadoPor(cargarUsuario(input.usuarioId()))
                .build();

        return incidenciaRepository.save(incidencia);
    }

    @Transactional
    public Incidencia actualizar(UUID id, IncidenciaGestionInput input) {
        var incidencia = findById(id);
        aplicarGestion(incidencia, input, false);
        return incidenciaRepository.save(incidencia);
    }

    @Transactional
    public Incidencia cerrar(UUID id, IncidenciaGestionInput input) {
        var incidencia = findById(id);
        aplicarGestion(incidencia, input, true);
        incidencia.setEstado(EstadoIncidencia.REVISADA);
        incidencia.setFechaCierre(LocalDateTime.now());
        incidencia.setCerradoPor(cargarUsuario(input.usuarioId()));

        if (incidencia.getActivo() != null
                && incidencia.getActivo().getEstado() == EstadoActivo.EN_MANTENIMIENTO) {
            activoService.cambiarEstado(incidencia.getActivo().getId(), EstadoActivo.ACTIVO);
        }

        return incidenciaRepository.save(incidencia);
    }

    private Incidencia buscarExistente(IncidenciaInput input) {
        if (!esVacio(input.notificacionId())) {
            return incidenciaRepository.findByNotificacionId(input.notificacionId().trim()).orElse(null);
        }
        if (input.activoId() != null) {
            return incidenciaRepository
                    .findFirstByActivoIdAndEstadoInOrderByFechaCreacionDesc(input.activoId(), ESTADOS_ABIERTOS)
                    .orElse(null);
        }
        return null;
    }

    private void actualizarDatosFuente(Incidencia incidencia, IncidenciaInput input) {
        if (incidencia.getEstado() == EstadoIncidencia.REVISADA) {
            return;
        }
        var activo = cargarActivo(input.activoId());
        incidencia.setActivo(activo);
        incidencia.setCodigoReferencia(codigoReferencia(input, activo));
        incidencia.setTitulo(input.titulo().trim());
        incidencia.setTipo(input.tipo().trim());
        incidencia.setArea(area(input, activo));
        incidencia.setPrioridad(input.prioridad());
        incidencia.setDetalle(input.detalle().trim());
    }

    private void aplicarGestion(Incidencia incidencia, IncidenciaGestionInput input, boolean cierre) {
        if (input.estado() != null && !cierre) {
            incidencia.setEstado(input.estado());
        }
        incidencia.setResponsableOperativo(limpiar(input.responsableOperativo()));
        incidencia.setDiagnostico(limpiar(input.diagnostico()));
        incidencia.setAccionEjecutada(limpiar(input.accionEjecutada()));
        incidencia.setProximaAccion(limpiar(input.proximaAccion()));
        incidencia.setFechaCompromiso(input.fechaCompromiso());
    }

    private Activo cargarActivo(UUID activoId) {
        if (activoId == null) {
            return null;
        }
        return activoRepository.findById(activoId)
                .orElseThrow(() -> new NoSuchElementException("Activo no encontrado: " + activoId));
    }

    private Usuario cargarUsuario(UUID usuarioId) {
        if (usuarioId == null) {
            return null;
        }
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + usuarioId));
    }

    private String codigoReferencia(IncidenciaInput input, Activo activo) {
        if (!esVacio(input.codigoReferencia())) {
            return input.codigoReferencia().trim();
        }
        if (activo != null) {
            return activo.getCodigo();
        }
        return input.notificacionId() == null ? "SIN-REFERENCIA" : input.notificacionId().trim();
    }

    private String area(IncidenciaInput input, Activo activo) {
        if (!esVacio(input.area())) {
            return input.area().trim();
        }
        if (activo != null && activo.getAreaActual() != null) {
            return activo.getAreaActual().getNombre();
        }
        return "Sin área";
    }

    private EstadoIncidencia estadoInicial(OrigenIncidencia origen) {
        return origen == OrigenIncidencia.ALERTA ? EstadoIncidencia.NUEVA : EstadoIncidencia.ABIERTA;
    }

    private boolean coincideBusqueda(Incidencia incidencia, String busqueda) {
        return contiene(incidencia.getCodigoReferencia(), busqueda)
                || contiene(incidencia.getTitulo(), busqueda)
                || contiene(incidencia.getTipo(), busqueda)
                || contiene(incidencia.getArea(), busqueda)
                || contiene(incidencia.getDetalle(), busqueda)
                || contiene(incidencia.getDiagnostico(), busqueda)
                || contiene(incidencia.getAccionEjecutada(), busqueda);
    }

    private boolean contiene(String valor, String busqueda) {
        return valor != null && valor.toLowerCase().contains(normalizar(busqueda));
    }

    private String normalizar(String valor) {
        return valor == null ? "" : valor.trim().toLowerCase();
    }

    private boolean esVacio(String valor) {
        return normalizar(valor).isBlank();
    }

    private String limpiar(String valor) {
        return esVacio(valor) ? null : valor.trim();
    }
}
