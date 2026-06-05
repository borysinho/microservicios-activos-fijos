package com.activos.ms1.service;

import com.activos.ms1.dto.input.TrasladoInput;
import com.activos.ms1.entity.*;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.infrastructure.ms3.MS3WebhookClient;
import com.activos.ms1.repository.AreaRepository;
import com.activos.ms1.repository.TrasladoRepository;
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
class TrasladoServiceTest {

    @Mock
    TrasladoRepository trasladoRepository;
    @Mock
    ActivoService activoService;
    @Mock
    AreaRepository areaRepository;
    @Mock
    UsuarioRepository usuarioRepository;
    @Mock
    BlockchainService blockchainService;
    @Mock
    MS3WebhookClient ms3WebhookClient;

    @InjectMocks
    TrasladoService trasladoService;

    private Activo activo;
    private Area areaOrigen;
    private Area areaDestino;
    private Usuario usuario;
    private UUID activoId;
    private UUID areaOrigenId;
    private UUID areaDestinoId;
    private UUID usuarioId;

    @BeforeEach
    void setUp() {
        activoId = UUID.randomUUID();
        areaOrigenId = UUID.randomUUID();
        areaDestinoId = UUID.randomUUID();
        usuarioId = UUID.randomUUID();

        CategoriaActivo categoria = CategoriaActivo.builder()
                .id(UUID.randomUUID())
                .nombre("Equipos")
                .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                .tasaDepreciacion(0.20)
                .build();

        areaOrigen = Area.builder().id(areaOrigenId).codigo("ORG").nombre("Origen").build();
        areaDestino = Area.builder().id(areaDestinoId).codigo("DST").nombre("Destino").build();

        activo = Activo.builder()
                .id(activoId)
                .codigo("EQ-001")
                .nombre("Laptop")
                .estado(EstadoActivo.ACTIVO)
                .categoria(categoria)
                .areaActual(areaOrigen)
                .fechaAdquisicion(LocalDate.now())
                .valorAdquisicion(new BigDecimal("5000.00"))
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
    void trasladar_activoConAreaOrigen_creaTraslado() {
        TrasladoInput input = new TrasladoInput(activoId, areaDestinoId, usuarioId, LocalDate.now(), "Remodelación");

        when(activoService.findById(activoId)).thenReturn(activo);
        when(areaRepository.findById(areaDestinoId)).thenReturn(Optional.of(areaDestino));
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(activoService.cambiarEstado(activoId, EstadoActivo.TRANSFERIDO)).thenReturn(activo);
        when(trasladoRepository.save(any(Traslado.class))).thenAnswer(inv -> inv.getArgument(0));

        Traslado result = trasladoService.trasladar(input);

        assertThat(result.getAreaOrigen()).isEqualTo(areaOrigen);
        assertThat(result.getAreaDestino()).isEqualTo(areaDestino);
        assertThat(result.getRecepcionConfirmada()).isFalse();
        verify(blockchainService).registrarTransaccion(activo, TipoTransaccionBlockchain.TRASLADO);
        verify(ms3WebhookClient).notificarEvento(eq("TRASLADO"), eq(activoId), anyString());
    }

    @Test
    void trasladar_activoDadoDeBaja_lanzaExcepcion() {
        activo.setEstado(EstadoActivo.DADO_DE_BAJA);
        TrasladoInput input = new TrasladoInput(activoId, areaDestinoId, usuarioId, LocalDate.now(), "Motivo");

        when(activoService.findById(activoId)).thenReturn(activo);

        assertThatThrownBy(() -> trasladoService.trasladar(input))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("dado de baja");
    }

    @Test
    void trasladar_mismaArea_lanzaExcepcion() {
        TrasladoInput input = new TrasladoInput(activoId, areaOrigenId, usuarioId, LocalDate.now(), "Motivo");

        when(activoService.findById(activoId)).thenReturn(activo);
        when(areaRepository.findById(areaOrigenId)).thenReturn(Optional.of(areaOrigen));
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));

        assertThatThrownBy(() -> trasladoService.trasladar(input))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("diferente al área origen");
    }

    @Test
    void confirmarRecepcion_marcaConfirmado() {
        UUID trasladoId = UUID.randomUUID();
        Traslado traslado = Traslado.builder()
                .id(trasladoId)
                .activo(activo)
                .areaOrigen(areaOrigen)
                .areaDestino(areaDestino)
                .autorizadoPor(usuario)
                .fecha(LocalDate.now())
                .recepcionConfirmada(false)
                .build();

        when(trasladoRepository.findById(trasladoId)).thenReturn(Optional.of(traslado));
        when(activoService.cambiarEstado(activoId, EstadoActivo.ACTIVO)).thenReturn(activo);
        when(trasladoRepository.save(any(Traslado.class))).thenAnswer(inv -> inv.getArgument(0));

        Traslado result = trasladoService.confirmarRecepcion(trasladoId);

        assertThat(result.getRecepcionConfirmada()).isTrue();
        verify(activoService).cambiarEstado(activoId, EstadoActivo.ACTIVO);
    }
}
