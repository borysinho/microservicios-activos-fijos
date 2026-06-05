package com.activos.ms1.entity;

import com.activos.ms1.entity.enums.EstadoActivo;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "activos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(name = "fecha_adquisicion", nullable = false)
    private LocalDate fechaAdquisicion;

    @Column(name = "valor_adquisicion", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorAdquisicion;

    @Column(name = "vida_util_anios", nullable = false)
    private Integer vidaUtilAnios;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoActivo estado = EstadoActivo.ACTIVO;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaActivo categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_actual_id")
    private Area areaActual;

    @Column(length = 100)
    private String ubicacion;

    @OneToMany(mappedBy = "activo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Asignacion> asignaciones = new ArrayList<>();

    @OneToMany(mappedBy = "activo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Traslado> traslados = new ArrayList<>();

    @OneToMany(mappedBy = "activo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RegistroBlockchain> registrosBlockchain = new ArrayList<>();
}
