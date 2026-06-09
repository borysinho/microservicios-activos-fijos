package com.activos.ms1.service;

import com.activos.ms1.dto.input.ActivoInput;
import com.activos.ms1.dto.input.FiltroActivoInput;
import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.repository.ActivoRepository;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.AsignacionRepository;
import com.activos.ms1.repository.CategoriaActivoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivoService {

    private final ActivoRepository activoRepository;
    private final CategoriaActivoRepository categoriaRepository;
    private final AreaRepository areaRepository;
    private final AsignacionRepository asignacionRepository;
    private final BlockchainService blockchainService;

    public List<Activo> findAll(FiltroActivoInput filtro) {
        if (filtro == null) {
            return activoRepository.findAllActivos();
        }
        String busqueda = normalizar(filtro.busqueda());
        return activoRepository.findAll().stream()
                .filter(a -> filtro.estado() == null || a.getEstado() == filtro.estado())
                .filter(a -> filtro.categoriaId() == null || a.getCategoria().getId().equals(filtro.categoriaId()))
                .filter(a -> filtro.areaId() == null || (a.getAreaActual() != null && a.getAreaActual().getId().equals(filtro.areaId())))
                .filter(a -> filtro.anioAdquisicionDesde() == null || a.getFechaAdquisicion().getYear() >= filtro.anioAdquisicionDesde())
                .filter(a -> filtro.anioAdquisicionHasta() == null || a.getFechaAdquisicion().getYear() <= filtro.anioAdquisicionHasta())
                .filter(a -> esVacio(filtro.codigo()) || contiene(a.getCodigo(), filtro.codigo()))
                .filter(a -> esVacio(filtro.nombre()) || contiene(a.getNombre(), filtro.nombre()))
                .filter(a -> esVacio(busqueda) || coincideBusquedaLibre(a, busqueda))
                .toList();
    }

    public Activo findById(UUID id) {
        return activoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Activo no encontrado: " + id));
    }

    public List<Activo> findByArea(UUID areaId) {
        return activoRepository.findByAreaActualId(areaId);
    }

    public List<Activo> findByResponsable(UUID responsableId) {
        return asignacionRepository.findByResponsableId(responsableId).stream()
                .filter(a -> a.getActiva())
                .map(a -> a.getActivo())
                .collect(Collectors.toList());
    }

    @Transactional
    public Activo registrar(ActivoInput input) {
        if (activoRepository.existsByCodigo(input.codigo())) {
            throw new IllegalArgumentException("Ya existe un activo con el código: " + input.codigo());
        }

        var categoria = categoriaRepository.findById(input.categoriaId())
                .orElseThrow(() -> new NoSuchElementException("Categoría no encontrada: " + input.categoriaId()));

        var activo = Activo.builder()
                .codigo(input.codigo())
                .nombre(input.nombre())
                .descripcion(input.descripcion())
                .fechaAdquisicion(input.fechaAdquisicion())
                .valorAdquisicion(input.valorAdquisicion())
                .vidaUtilAnios(input.vidaUtilAnios())
                .categoria(categoria)
                .ubicacion(input.ubicacion())
                .estado(EstadoActivo.ACTIVO)
                .build();

        if (input.areaActualId() != null) {
            var area = areaRepository.findById(input.areaActualId())
                    .orElseThrow(() -> new NoSuchElementException("Área no encontrada: " + input.areaActualId()));
            activo.setAreaActual(area);
        }

        var saved = activoRepository.save(activo);
        blockchainService.registrarTransaccion(saved, TipoTransaccionBlockchain.REGISTRO);
        return saved;
    }

    @Transactional
    public Activo actualizar(UUID id, ActivoInput input) {
        var activo = findById(id);

        if (!activo.getCodigo().equals(input.codigo()) && activoRepository.existsByCodigo(input.codigo())) {
            throw new IllegalArgumentException("Ya existe un activo con el código: " + input.codigo());
        }

        var categoria = categoriaRepository.findById(input.categoriaId())
                .orElseThrow(() -> new NoSuchElementException("Categoría no encontrada: " + input.categoriaId()));

        activo.setCodigo(input.codigo());
        activo.setNombre(input.nombre());
        activo.setDescripcion(input.descripcion());
        activo.setFechaAdquisicion(input.fechaAdquisicion());
        activo.setValorAdquisicion(input.valorAdquisicion());
        activo.setVidaUtilAnios(input.vidaUtilAnios());
        activo.setCategoria(categoria);
        activo.setUbicacion(input.ubicacion());

        if (input.areaActualId() != null) {
            var area = areaRepository.findById(input.areaActualId())
                    .orElseThrow(() -> new NoSuchElementException("Área no encontrada: " + input.areaActualId()));
            activo.setAreaActual(area);
        }

        return activoRepository.save(activo);
    }

    @Transactional
    public Activo actualizarUbicacion(UUID activoId, String ubicacion) {
        var activo = findById(activoId);
        activo.setUbicacion(ubicacion);
        return activoRepository.save(activo);
    }

    @Transactional
    public Activo cambiarEstado(UUID activoId, EstadoActivo nuevoEstado) {
        var activo = findById(activoId);
        validarTransicionEstado(activo.getEstado(), nuevoEstado);
        activo.setEstado(nuevoEstado);
        var saved = activoRepository.save(activo);
        blockchainService.registrarTransaccion(saved, TipoTransaccionBlockchain.MANTENIMIENTO);
        return saved;
    }

    private void validarTransicionEstado(EstadoActivo actual, EstadoActivo nuevo) {
        boolean valido = switch (actual) {
            case ACTIVO ->
                nuevo == EstadoActivo.EN_MANTENIMIENTO
                || nuevo == EstadoActivo.TRANSFERIDO
                || nuevo == EstadoActivo.DADO_DE_BAJA;
            case EN_MANTENIMIENTO ->
                nuevo == EstadoActivo.ACTIVO
                || nuevo == EstadoActivo.DADO_DE_BAJA;
            case TRANSFERIDO ->
                nuevo == EstadoActivo.ACTIVO;
            case DADO_DE_BAJA ->
                false;
        };
        if (!valido) {
            throw new IllegalStateException(
                    "Transición de estado inválida: %s → %s".formatted(actual, nuevo));
        }
    }

    private boolean coincideBusquedaLibre(Activo activo, String busqueda) {
        return contiene(activo.getCodigo(), busqueda)
                || contiene(activo.getNombre(), busqueda)
                || contiene(activo.getDescripcion(), busqueda)
                || (activo.getCategoria() != null && contiene(activo.getCategoria().getNombre(), busqueda));
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
}
