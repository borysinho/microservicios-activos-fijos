package com.activos.ms1.repository;

import com.activos.ms1.entity.Baja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BajaRepository extends JpaRepository<Baja, UUID> {

    Optional<Baja> findByActivoId(UUID activoId);

    boolean existsByActivoId(UUID activoId);
}
