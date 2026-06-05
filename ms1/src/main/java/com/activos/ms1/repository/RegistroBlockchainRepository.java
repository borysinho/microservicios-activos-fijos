package com.activos.ms1.repository;

import com.activos.ms1.entity.RegistroBlockchain;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegistroBlockchainRepository extends JpaRepository<RegistroBlockchain, UUID> {

    List<RegistroBlockchain> findByActivoIdOrderByTimestampDesc(UUID activoId);

    Optional<RegistroBlockchain> findByHash(String hash);

    List<RegistroBlockchain> findByTipoTransaccion(TipoTransaccionBlockchain tipo);
}
