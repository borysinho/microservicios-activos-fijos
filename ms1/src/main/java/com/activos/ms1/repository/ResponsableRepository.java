package com.activos.ms1.repository;

import com.activos.ms1.entity.Responsable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResponsableRepository extends JpaRepository<Responsable, UUID> {

    Optional<Responsable> findByEmail(String email);

    boolean existsByEmail(String email);
}
