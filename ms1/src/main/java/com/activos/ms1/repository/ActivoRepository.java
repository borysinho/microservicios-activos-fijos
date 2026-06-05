package com.activos.ms1.repository;

import com.activos.ms1.entity.Activo;
import com.activos.ms1.entity.enums.EstadoActivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActivoRepository extends JpaRepository<Activo, UUID>, JpaSpecificationExecutor<Activo> {

    Optional<Activo> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    List<Activo> findByEstado(EstadoActivo estado);

    List<Activo> findByCategoriaId(UUID categoriaId);

    List<Activo> findByAreaActualId(UUID areaId);

    @Query("SELECT a FROM Activo a WHERE a.estado != 'DADO_DE_BAJA' ORDER BY a.fechaAdquisicion DESC")
    List<Activo> findAllActivos();

    @Query("SELECT COUNT(a) FROM Activo a WHERE a.estado = :estado")
    long countByEstado(@Param("estado") EstadoActivo estado);
}
