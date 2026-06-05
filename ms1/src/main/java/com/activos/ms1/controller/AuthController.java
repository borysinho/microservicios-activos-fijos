package com.activos.ms1.controller;

import com.activos.ms1.config.JwtUtil;
import com.activos.ms1.entity.Usuario;
import com.activos.ms1.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;

    record LoginRequest(String username, String password) {

    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password()));

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        String token = jwtUtil.generateToken(userDetails);

        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("SOLO_LECTURA");

        Usuario usuario = usuarioRepository.findByUsername(userDetails.getUsername())
                .orElseThrow();

        return ResponseEntity.ok(Map.of(
                "token", token,
                "id", usuario.getId().toString(),
                "username", usuario.getUsername(),
                "email", usuario.getEmail(),
                "rol", role
        ));
    }
}
