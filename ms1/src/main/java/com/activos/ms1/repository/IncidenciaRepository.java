package com.activos.ms1.repository;

import com.activos.ms1.entity.Incidencia;
import com.activos.ms1.entity.enums.EstadoIncidencia;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IncidenciaRepository extends JpaRepository<Incidencia, UUID> {

    List<Incidencia> findByEstadoInOrderByFechaCreacionDesc(Collection<EstadoIncidencia> estados);

    List<Incidencia> findByActivoIdOrderByFechaCreacionDesc(UUID activoId);

    Optional<Incidencia> findByNotificacionId(String notificacionId);

    Optional<Incidencia> findFirstByActivoIdAndEstadoInOrderByFechaCreacionDesc(
            UUID activoId,
            Collection<EstadoIncidencia> estados);
}
