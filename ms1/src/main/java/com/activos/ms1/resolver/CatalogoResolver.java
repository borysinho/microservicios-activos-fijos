package com.activos.ms1.resolver;

import com.activos.ms1.dto.input.AreaInput;
import com.activos.ms1.dto.input.CategoriaActivoInput;
import com.activos.ms1.dto.input.ResponsableInput;
import com.activos.ms1.dto.input.UsuarioInput;
import com.activos.ms1.entity.Area;
import com.activos.ms1.entity.Baja;
import com.activos.ms1.entity.CategoriaActivo;
import com.activos.ms1.entity.Responsable;
import com.activos.ms1.entity.Usuario;
import com.activos.ms1.entity.enums.RolUsuario;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.BajaRepository;
import com.activos.ms1.repository.CategoriaActivoRepository;
import com.activos.ms1.repository.ResponsableRepository;
import com.activos.ms1.repository.UsuarioRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class CatalogoResolver {

    private final UsuarioRepository usuarioRepository;
    private final CategoriaActivoRepository categoriaRepository;
    private final AreaRepository areaRepository;
    private final ResponsableRepository responsableRepository;
    private final BajaRepository bajaRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Queries ──────────────────────────────────────────────────────────────
    @QueryMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR')")
    public List<Usuario> usuarios() {
        return usuarioRepository.findAll();
    }

    @QueryMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR')")
    public Usuario usuario(@Argument String id) {
        return usuarioRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<CategoriaActivo> categorias() {
        return categoriaRepository.findAll();
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Area> areas() {
        return areaRepository.findAll();
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Responsable> responsables() {
        return responsableRepository.findAll();
    }

    @QueryMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR')")
    public List<Usuario> buscarUsuarios(@Argument String query) {
        String q = query.toLowerCase();
        return usuarioRepository.findAll().stream()
                .filter(u -> u.getUsername().toLowerCase().contains(q)
                || u.getEmail().toLowerCase().contains(q))
                .toList();
    }

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public List<Baja> bajas() {
        return bajaRepository.findAll();
    }

    // ── Mutations: Usuarios ──────────────────────────────────────────────────
    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Usuario crearUsuario(@Argument @Valid UsuarioInput input) {
        if (input.password() == null || input.password().isBlank() || input.password().length() < 6) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 6 caracteres.");
        }
        if (usuarioRepository.existsByUsername(input.username())) {
            throw new IllegalArgumentException("El username '" + input.username() + "' ya existe.");
        }
        Usuario usuario = Usuario.builder()
                .username(input.username())
                .email(input.email())
                .passwordHash(passwordEncoder.encode(input.password()))
                .rol(input.rol())
                .activo(true)
                .build();
        return usuarioRepository.save(usuario);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Usuario actualizarUsuario(@Argument String id, @Argument @Valid UsuarioInput input) {
        Usuario u = usuarioRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        if (!u.getUsername().equals(input.username()) && usuarioRepository.existsByUsername(input.username())) {
            throw new IllegalArgumentException("El username '" + input.username() + "' ya existe.");
        }
        u.setUsername(input.username());
        u.setEmail(input.email());
        u.setRol(input.rol());
        if (input.password() != null && !input.password().isBlank()) {
            u.setPasswordHash(passwordEncoder.encode(input.password()));
        }
        return usuarioRepository.save(u);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Usuario cambiarRolUsuario(@Argument String id, @Argument RolUsuario rol) {
        Usuario u = usuarioRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        u.setRol(rol);
        return usuarioRepository.save(u);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Usuario toggleUsuario(@Argument String id) {
        Usuario u = usuarioRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        u.setActivo(!u.getActivo());
        return usuarioRepository.save(u);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Usuario restablecerPassword(@Argument String id, @Argument String nuevaPassword) {
        if (nuevaPassword == null || nuevaPassword.length() < 6) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 6 caracteres.");
        }
        Usuario u = usuarioRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        u.setPasswordHash(passwordEncoder.encode(nuevaPassword));
        return usuarioRepository.save(u);
    }

    // ── Mutations: Áreas ─────────────────────────────────────────────────────
    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Area crearArea(@Argument @Valid AreaInput input) {
        Responsable responsable = input.responsableId() != null
                ? responsableRepository.findById(input.responsableId()).orElse(null)
                : null;
        Area area = Area.builder()
                .codigo(input.codigo())
                .nombre(input.nombre())
                .descripcion(input.descripcion())
                .responsable(responsable)
                .build();
        return areaRepository.save(area);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Area actualizarArea(@Argument String id, @Argument @Valid AreaInput input) {
        Area area = areaRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Área no encontrada: " + id));
        area.setCodigo(input.codigo());
        area.setNombre(input.nombre());
        area.setDescripcion(input.descripcion());
        if (input.responsableId() != null) {
            responsableRepository.findById(input.responsableId()).ifPresent(area::setResponsable);
        } else {
            area.setResponsable(null);
        }
        return areaRepository.save(area);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public boolean eliminarArea(@Argument String id) {
        Area area = areaRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Área no encontrada: " + id));
        areaRepository.delete(area);
        return true;
    }

    // ── Mutations: Responsables ──────────────────────────────────────────────
    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Responsable crearResponsable(@Argument @Valid ResponsableInput input) {
        Responsable r = Responsable.builder()
                .nombre(input.nombre())
                .cargo(input.cargo())
                .email(input.email())
                .telefono(input.telefono())
                .build();
        return responsableRepository.save(r);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Responsable actualizarResponsable(@Argument String id, @Argument @Valid ResponsableInput input) {
        Responsable r = responsableRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Responsable no encontrado: " + id));
        r.setNombre(input.nombre());
        r.setCargo(input.cargo());
        r.setEmail(input.email());
        r.setTelefono(input.telefono());
        return responsableRepository.save(r);
    }

    // ── Mutations: Categorías ────────────────────────────────────────────────
    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public CategoriaActivo crearCategoriaActivo(@Argument @Valid CategoriaActivoInput input) {
        CategoriaActivo cat = CategoriaActivo.builder()
                .nombre(input.nombre())
                .descripcion(input.descripcion())
                .metodoDepreciacion(input.metodoDepreciacion())
                .tasaDepreciacion(input.tasaDepreciacion())
                .build();
        return categoriaRepository.save(cat);
    }

    @MutationMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public CategoriaActivo actualizarCategoriaActivo(@Argument String id, @Argument @Valid CategoriaActivoInput input) {
        CategoriaActivo cat = categoriaRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada: " + id));
        cat.setNombre(input.nombre());
        cat.setDescripcion(input.descripcion());
        cat.setMetodoDepreciacion(input.metodoDepreciacion());
        cat.setTasaDepreciacion(input.tasaDepreciacion());
        return categoriaRepository.save(cat);
    }
}
