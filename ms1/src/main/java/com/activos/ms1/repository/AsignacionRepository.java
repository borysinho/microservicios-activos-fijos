package com.activos.ms1.repository;

import com.activos.ms1.entity.Asignacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AsignacionRepository extends JpaRepository<Asignacion, UUID> {

    List<Asignacion> findByActivoId(UUID activoId);

    List<Asignacion> findByResponsableId(UUID responsableId);

    List<Asignacion> findByAreaId(UUID areaId);

    Optional<Asignacion> findByActivoIdAndActivaTrue(UUID activoId);

    List<Asignacion> findByActivaTrue();
}
