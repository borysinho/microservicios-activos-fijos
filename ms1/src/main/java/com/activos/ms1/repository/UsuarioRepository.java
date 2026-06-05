package com.activos.ms1.repository;

import com.activos.ms1.entity.Usuario;
import com.activos.ms1.entity.enums.RolUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByUsername(String username);

    Optional<Usuario> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    List<Usuario> findByRol(RolUsuario rol);

    List<Usuario> findByActivoTrue();
}
