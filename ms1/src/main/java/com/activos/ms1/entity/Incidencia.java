package com.activos.ms1.entity;

import com.activos.ms1.entity.enums.EstadoIncidencia;
import com.activos.ms1.entity.enums.OrigenIncidencia;
import com.activos.ms1.entity.enums.PrioridadIncidencia;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "incidencias")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrigenIncidencia origen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activo_id")
    private Activo activo;

    @Column(name = "notificacion_id", length = 120)
    private String notificacionId;

    @Column(name = "codigo_referencia", nullable = false, length = 80)
    private String codigoReferencia;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, length = 80)
    private String tipo;

    @Column(length = 150)
    private String area;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrioridadIncidencia prioridad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoIncidencia estado;

    @Column(nullable = false, length = 1000)
    private String detalle;

    @Column(name = "responsable_operativo", length = 150)
    private String responsableOperativo;

    @Column(length = 1000)
    private String diagnostico;

    @Column(name = "accion_ejecutada", length = 1000)
    private String accionEjecutada;

    @Column(name = "proxima_accion", length = 500)
    private String proximaAccion;

    @Column(name = "fecha_compromiso")
    private LocalDate fechaCompromiso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id")
    private Usuario creadoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cerrado_por_id")
    private Usuario cerradoPor;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        fechaCreacion = now;
        fechaActualizacion = now;
    }

    @PreUpdate
    void preUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
