package com.activos.ms1.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "traslados")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Traslado {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activo_id", nullable = false)
    private Activo activo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_origen_id", nullable = false)
    private Area areaOrigen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_destino_id", nullable = false)
    private Area areaDestino;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autorizado_por_id", nullable = false)
    private Usuario autorizadoPor;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "motivo_traslado", length = 500)
    private String motivoTraslado;

    @Column(name = "recepcion_confirmada", nullable = false)
    @Builder.Default
    private Boolean recepcionConfirmada = false;
}
