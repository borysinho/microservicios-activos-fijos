package com.activos.ms1.service;

import com.activos.ms1.dto.input.BajaInput;
import com.activos.ms1.entity.*;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.ms3.MS3WebhookClient;
import com.activos.ms1.repository.BajaRepository;
import com.activos.ms1.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BajaServiceTest {

    @Mock
    BajaRepository bajaRepository;
    @Mock
    ActivoService activoService;
    @Mock
    UsuarioRepository usuarioRepository;
    @Mock
    BlockchainService blockchainService;
    @Mock
    MS3WebhookClient ms3WebhookClient;

    @InjectMocks
    BajaService bajaService;

    private Activo activo;
    private Usuario usuario;
    private UUID activoId;
    private UUID usuarioId;

    @BeforeEach
    void setUp() {
        activoId = UUID.randomUUID();
        usuarioId = UUID.randomUUID();

        CategoriaActivo categoria = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Equipos")
                .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                .tasaDepreciacion(0.20)
                .build();

        activo = Activo.builder()
                .id(activoId)
                .codigo("EQ-001")
                .nombre("Laptop Vieja")
                .estado(EstadoActivo.ACTIVO)
                .categoria(categoria)
                .fechaAdquisicion(LocalDate.of(2015, 1, 1))
                .valorAdquisicion(new BigDecimal("2000.00"))
                .vidaUtilAnios(5)
                .asignaciones(new ArrayList<>())
                .traslados(new ArrayList<>())
                .registrosBlockchain(new ArrayList<>())
                .build();

        usuario = Usuario.builder()
                .id(usuarioId)
                .username("admin")
                .email("admin@test.com")
                .build();
    }

    @Test
    void darDeBaja_activoDisponible_registraBajaYBlockchain() {
        BajaInput input = new BajaInput(activoId, usuarioId, "Obsolescencia", new BigDecimal("100.00"), "RES-001");

        when(bajaRepository.existsByActivoId(activoId)).thenReturn(false);
        when(activoService.findById(activoId)).thenReturn(activo);
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(bajaRepository.save(any(Baja.class))).thenAnswer(inv -> inv.getArgument(0));

        Baja result = bajaService.darDeBaja(input);

        assertThat(result.getMotivo()).isEqualTo("Obsolescencia");
        assertThat(result.getValorResidual()).isEqualByComparingTo("100.00");
        assertThat(result.getNumeroResolucion()).isEqualTo("RES-001");
        assertThat(result.getAutorizada()).isTrue();
        assertThat(activo.getEstado()).isEqualTo(EstadoActivo.DADO_DE_BAJA);
        verify(blockchainService).registrarTransaccion(activo, TipoTransaccionBlockchain.BAJA);
        verify(ms3WebhookClient).notificarEvento(eq("BAJA"), eq(activoId), anyString());
    }

    @Test
    void darDeBaja_bajaYaExistente_lanzaExcepcion() {
        BajaInput input = new BajaInput(activoId, usuarioId, "Motivo", null, null);
        when(bajaRepository.existsByActivoId(activoId)).thenReturn(true);

        assertThatThrownBy(() -> bajaService.darDeBaja(input))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ya tiene un registro de baja");
    }

    @Test
    void darDeBaja_activoYaDadoDeBaja_lanzaExcepcion() {
        activo.setEstado(EstadoActivo.DADO_DE_BAJA);
        BajaInput input = new BajaInput(activoId, usuarioId, "Motivo", null, null);

        when(bajaRepository.existsByActivoId(activoId)).thenReturn(false);
        when(activoService.findById(activoId)).thenReturn(activo);

        assertThatThrownBy(() -> bajaService.darDeBaja(input))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ya está dado de baja");
    }

    @Test
    void darDeBaja_sinValorResidual_usaCero() {
        BajaInput input = new BajaInput(activoId, usuarioId, "Desgaste total", null, null);

        when(bajaRepository.existsByActivoId(activoId)).thenReturn(false);
        when(activoService.findById(activoId)).thenReturn(activo);
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(bajaRepository.save(any(Baja.class))).thenAnswer(inv -> inv.getArgument(0));

        Baja result = bajaService.darDeBaja(input);

        assertThat(result.getValorResidual()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void findByActivo_sinBaja_lanzaExcepcion() {
        when(bajaRepository.findByActivoId(activoId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bajaService.findByActivo(activoId))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    void registrarBaja_creaBajaPendienteSinBlockchain() {
        BajaInput input = new BajaInput(activoId, usuarioId, "Pendiente de resolución", null, "RES-002");

        when(bajaRepository.existsByActivoId(activoId)).thenReturn(false);
        when(activoService.findById(activoId)).thenReturn(activo);
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(bajaRepository.save(any(Baja.class))).thenAnswer(inv -> inv.getArgument(0));

        Baja result = bajaService.registrarBaja(input);

        assertThat(result.getAutorizada()).isFalse();
        assertThat(activo.getEstado()).isEqualTo(EstadoActivo.ACTIVO);
        verifyNoInteractions(blockchainService);
        verifyNoInteractions(ms3WebhookClient);
    }

    @Test
    void autorizarBaja_pendiente_cambiaEstadoYRegistraBlockchain() {
        UUID bajaId = UUID.randomUUID();
        Baja baja = Baja.builder()
                .id(bajaId)
                .activo(activo)
                .autorizadoPor(usuario)
                .fecha(LocalDate.now())
                .motivo("Obsolescencia")
                .valorResidual(BigDecimal.ZERO)
                .autorizada(false)
                .build();

        when(bajaRepository.findById(bajaId)).thenReturn(Optional.of(baja));
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(bajaRepository.save(any(Baja.class))).thenAnswer(inv -> inv.getArgument(0));

        Baja result = bajaService.autorizarBaja(bajaId, usuarioId);

        assertThat(result.getAutorizada()).isTrue();
        assertThat(activo.getEstado()).isEqualTo(EstadoActivo.DADO_DE_BAJA);
        verify(blockchainService).registrarTransaccion(activo, TipoTransaccionBlockchain.BAJA);
        verify(ms3WebhookClient).notificarEvento(eq("BAJA"), eq(activoId), anyString());
    }
}
