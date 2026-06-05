package com.activos.ms1.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "bajas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Baja {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activo_id", nullable = false, unique = true)
    private Activo activo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autorizado_por_id", nullable = false)
    private Usuario autorizadoPor;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 500)
    private String motivo;

    @Column(name = "valor_residual", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal valorResidual = BigDecimal.ZERO;

    @Column(name = "numero_resolucion", length = 100)
    private String numeroResolucion;
}
