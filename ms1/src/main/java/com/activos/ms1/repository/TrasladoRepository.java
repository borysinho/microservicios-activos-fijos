package com.activos.ms1.repository;

import com.activos.ms1.entity.Traslado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TrasladoRepository extends JpaRepository<Traslado, UUID> {

    List<Traslado> findByActivoId(UUID activoId);

    List<Traslado> findByAreaDestinoId(UUID areaId);

    List<Traslado> findByAreaOrigenId(UUID areaId);

    List<Traslado> findByRecepcionConfirmadaFalse();
}
