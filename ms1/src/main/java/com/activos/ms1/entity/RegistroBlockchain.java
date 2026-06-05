package com.activos.ms1.entity;

import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "registros_blockchain")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistroBlockchain {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activo_id", nullable = false)
    private Activo activo;

    @Column(nullable = false, length = 66)
    private String hash;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_transaccion", nullable = false)
    private TipoTransaccionBlockchain tipoTransaccion;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;

    @Column(name = "bloque_id", length = 100)
    private String bloqueId;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
