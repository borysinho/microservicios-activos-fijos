package com.activos.ms1.repository;

import com.activos.ms1.entity.CategoriaActivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoriaActivoRepository extends JpaRepository<CategoriaActivo, UUID> {

    Optional<CategoriaActivo> findByNombre(String nombre);

    boolean existsByNombre(String nombre);
}
