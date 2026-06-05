package com.activos.ms1.repository;

import com.activos.ms1.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AreaRepository extends JpaRepository<Area, UUID> {

    Optional<Area> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);
}
