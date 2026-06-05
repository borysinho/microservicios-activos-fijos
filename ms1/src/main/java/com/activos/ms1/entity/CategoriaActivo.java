package com.activos.ms1.entity;

import com.activos.ms1.entity.enums.MetodoDepreciacion;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "categorias_activo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoriaActivo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_depreciacion", nullable = false)
    private MetodoDepreciacion metodoDepreciacion;

    @Column(name = "tasa_depreciacion", nullable = false)
    private Double tasaDepreciacion;
}
