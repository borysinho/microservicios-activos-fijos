package com.activos.ms1.config;

import com.activos.ms1.entity.*;
import com.activos.ms1.entity.enums.EstadoActivo;
import com.activos.ms1.entity.enums.MetodoDepreciacion;
import com.activos.ms1.entity.enums.RolUsuario;
import com.activos.ms1.entity.enums.TipoTransaccionBlockchain;
import com.activos.ms1.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String BORYS_USERNAME = "borys.quiroga";
    private static final String BORYS_EMAIL = "quirogaborys@gmail.com";
    private static final String BORYS_PHONE = "591-77685777";

    private final UsuarioRepository usuarioRepository;
    private final CategoriaActivoRepository categoriaRepository;
    private final AreaRepository areaRepository;
    private final ActivoRepository activoRepository;
    private final ResponsableRepository responsableRepository;
    private final AsignacionRepository asignacionRepository;
    private final TrasladoRepository trasladoRepository;
    private final BajaRepository bajaRepository;
    private final RegistroBlockchainRepository blockchainRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${spring.security.user.name:admin}")
    private String adminUsername;

    @Value("${spring.security.user.password:admin123}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        seedUsuarios();
        seedCatalogos();
        seedResponsables();
        seedAsignaciones();
        seedBorysDemo();
        seedTraslados();
        seedBajas();
        seedBlockchain();
    }

    // ─── Usuarios ─────────────────────────────────────────────────────────────
    private void seedUsuarios() {
        crearOActualizarAdminConfigurado();
        crearOActualizarUsuario("admin", "admin@saf.bo", "admin123", RolUsuario.ADMINISTRADOR);
        crearUsuarioSiNoExiste("auditor", "auditor@saf.bo", "audit123", RolUsuario.AUDITOR);
        crearUsuarioSiNoExiste("responsable", "responsable@saf.bo", "resp123", RolUsuario.RESPONSABLE_AREA);
        crearUsuarioSiNoExiste("lector", "lector@saf.bo", "read123", RolUsuario.SOLO_LECTURA);
        // usuarios adicionales para pruebas Módulo 7 — Gestión de Usuarios (CU-46 a CU-53)
        crearUsuarioSiNoExiste("ana.garcia", "ana.garcia@saf.bo", "garcia123", RolUsuario.RESPONSABLE_AREA);
        crearUsuarioSiNoExiste("carlos.ruiz", "carlos.ruiz@saf.bo", "ruiz123", RolUsuario.RESPONSABLE_AREA);
        crearUsuarioSiNoExiste("juana.vargas", "juana.vargas@saf.bo", "vargas123", RolUsuario.AUDITOR);
        crearUsuarioSiNoExiste("pedro.morales", "pedro.morales@saf.bo", "morales123", RolUsuario.SOLO_LECTURA);
        crearUsuarioSiNoExiste("supervisor", "supervisor@saf.bo", "super123", RolUsuario.ADMINISTRADOR);
        crearOActualizarUsuario(BORYS_USERNAME, BORYS_EMAIL, "borys123", RolUsuario.RESPONSABLE_AREA);
        log.info("DataInitializer: usuarios demo verificados");
    }

    // ─── Catálogos base: Categorías + Áreas + Activos ─────────────────────────
    private void seedCatalogos() {
        // ── Categorías ──────────────────────────────────────────────────────
        CategoriaActivo catEquipos, catMobiliario, catVehiculos, catMaquinaria, catInfraestructura;
        if (categoriaRepository.count() == 0) {
            catEquipos = categoriaRepository.save(CategoriaActivo.builder()
                    .nombre("Equipos de Cómputo")
                    .descripcion("Computadoras, laptops, servidores y periféricos")
                    .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                    .tasaDepreciacion(0.25)
                    .build());

            catMobiliario = categoriaRepository.save(CategoriaActivo.builder()
                    .nombre("Mobiliario y Equipo de Oficina")
                    .descripcion("Escritorios, sillas, archivadores y similares")
                    .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                    .tasaDepreciacion(0.10)
                    .build());

            catVehiculos = categoriaRepository.save(CategoriaActivo.builder()
                    .nombre("Vehículos")
                    .descripcion("Automóviles, camionetas y motocicletas")
                    .metodoDepreciacion(MetodoDepreciacion.ACELERADO)
                    .tasaDepreciacion(0.20)
                    .build());

            catMaquinaria = categoriaRepository.save(CategoriaActivo.builder()
                    .nombre("Maquinaria y Equipo Industrial")
                    .descripcion("Equipos de producción y maquinaria pesada")
                    .metodoDepreciacion(MetodoDepreciacion.SUMA_DIGITOS)
                    .tasaDepreciacion(0.15)
                    .build());

            catInfraestructura = categoriaRepository.save(CategoriaActivo.builder()
                    .nombre("Infraestructura de Red")
                    .descripcion("Switches, routers, cableado estructurado y equipos de comunicaciones")
                    .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                    .tasaDepreciacion(0.20)
                    .build());

            log.info("DataInitializer: 5 categorías creadas");
        } else {
            var cats = categoriaRepository.findAll();
            catEquipos = cats.stream().filter(c -> c.getNombre().startsWith("Equipos")).findFirst().orElse(cats.get(0));
            catMobiliario = cats.stream().filter(c -> c.getNombre().startsWith("Mobiliario")).findFirst().orElse(cats.get(0));
            catVehiculos = cats.stream().filter(c -> c.getNombre().startsWith("Vehículo")).findFirst().orElse(cats.get(0));
            catMaquinaria = cats.stream().filter(c -> c.getNombre().startsWith("Maquinaria")).findFirst().orElse(cats.get(0));
            catInfraestructura = cats.stream().filter(c -> c.getNombre().startsWith("Infraestructura")).findFirst().orElse(cats.get(0));
        }

        // ── Áreas ────────────────────────────────────────────────────────────
        Area areaTI, areaAdmin, areaLog, areaContab;
        if (areaRepository.count() == 0) {
            areaTI = areaRepository.save(Area.builder()
                    .codigo("TI-001")
                    .nombre("Tecnologías de Información")
                    .descripcion("Área de sistemas y soporte tecnológico")
                    .build());

            areaAdmin = areaRepository.save(Area.builder()
                    .codigo("ADM-001")
                    .nombre("Administración General")
                    .descripcion("Gerencia y administración corporativa")
                    .build());

            areaLog = areaRepository.save(Area.builder()
                    .codigo("LOG-001")
                    .nombre("Logística y Operaciones")
                    .descripcion("Almacén, distribución y operaciones")
                    .build());

            areaContab = areaRepository.save(Area.builder()
                    .codigo("CONT-001")
                    .nombre("Contabilidad y Finanzas")
                    .descripcion("Gestión financiera y contable")
                    .build());

            areaRepository.save(Area.builder()
                    .codigo("RRHH-001")
                    .nombre("Recursos Humanos")
                    .descripcion("Gestión del talento humano y nómina")
                    .build());

            log.info("DataInitializer: 5 áreas creadas");
        } else {
            var areas = areaRepository.findAll();
            areaTI = areas.stream().filter(a -> a.getCodigo().startsWith("TI")).findFirst().orElse(areas.get(0));
            areaAdmin = areas.stream().filter(a -> a.getCodigo().startsWith("ADM")).findFirst().orElse(areas.get(0));
            areaLog = areas.stream().filter(a -> a.getCodigo().startsWith("LOG")).findFirst().orElse(areas.get(0));
            areaContab = areas.stream().filter(a -> a.getCodigo().startsWith("CONT")).findFirst().orElse(areas.get(0));
        }

        // ── Activos ───────────────────────────────────────────────────────────
        if (activoRepository.count() > 0) {
            log.info("DataInitializer: activos ya existen, omitiendo seed");
            return;
        }

        // —— Equipos de Cómputo ——
        activoRepository.save(Activo.builder()
                .codigo("EQ-2022-001")
                .nombre("Servidor Dell PowerEdge R740")
                .descripcion("Servidor de alto rendimiento para base de datos corporativa")
                .fechaAdquisicion(LocalDate.of(2022, 3, 15))
                .valorAdquisicion(new BigDecimal("45000.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catEquipos)
                .areaActual(areaTI)
                .ubicacion("Sala de Servidores — Rack A2")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("EQ-2023-002")
                .nombre("Laptop HP EliteBook 840 G9")
                .descripcion("Laptop empresarial para gerencia — 16GB RAM, 512GB SSD")
                .fechaAdquisicion(LocalDate.of(2023, 1, 20))
                .valorAdquisicion(new BigDecimal("9500.00"))
                .vidaUtilAnios(4)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catEquipos)
                .areaActual(areaTI)
                .ubicacion("Oficina TI — Piso 2")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("EQ-2021-003")
                .nombre("Impresora HP LaserJet Pro M404dn")
                .descripcion("Impresora láser monocromática de alto volumen")
                .fechaAdquisicion(LocalDate.of(2021, 7, 10))
                .valorAdquisicion(new BigDecimal("3200.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.EN_MANTENIMIENTO)
                .categoria(catEquipos)
                .areaActual(areaContab)
                .ubicacion("Contabilidad — Piso 1")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("EQ-2024-005")
                .nombre("MacBook Pro M3 14\"")
                .descripcion("Laptop para diseño y desarrollo — chip Apple M3")
                .fechaAdquisicion(LocalDate.of(2024, 1, 8))
                .valorAdquisicion(new BigDecimal("12500.00"))
                .vidaUtilAnios(4)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catEquipos)
                .areaActual(areaTI)
                .ubicacion("Oficina Desarrollo — Piso 2")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("EQ-2023-006")
                .nombre("Monitor LG UltraWide 34\" 5K")
                .descripcion("Monitor ultrapanorámico para estaciones de diseño y desarrollo")
                .fechaAdquisicion(LocalDate.of(2023, 8, 12))
                .valorAdquisicion(new BigDecimal("4200.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catEquipos)
                .areaActual(areaTI)
                .ubicacion("Oficina Desarrollo — Piso 2")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("EQ-2025-007")
                .nombre("UPS APC Smart-UPS 3000VA")
                .descripcion("Sistema de alimentación ininterrumpida para sala de servidores")
                .fechaAdquisicion(LocalDate.of(2025, 2, 5))
                .valorAdquisicion(new BigDecimal("8900.00"))
                .vidaUtilAnios(6)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catEquipos)
                .areaActual(areaTI)
                .ubicacion("Sala de Servidores — Rack B1")
                .build());

        // —— Equipo DADO_DE_BAJA (para probar CU-22 a CU-24 y Blockchain CU-78/CU-80) ——
        activoRepository.save(Activo.builder()
                .codigo("EQ-2018-004")
                .nombre("Switch Cisco Catalyst 2960-X")
                .descripcion("Switch de red 48 puertos PoE — reemplazado por nueva infraestructura")
                .fechaAdquisicion(LocalDate.of(2018, 6, 1))
                .valorAdquisicion(new BigDecimal("7500.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.DADO_DE_BAJA)
                .categoria(catInfraestructura)
                .areaActual(areaTI)
                .ubicacion("Depósito TI")
                .build());

        // —— Mobiliario ——
        activoRepository.save(Activo.builder()
                .codigo("MOB-2020-001")
                .nombre("Estación de Trabajo Ergonómica")
                .descripcion("Escritorio regulable en altura con silla ergonómica")
                .fechaAdquisicion(LocalDate.of(2020, 11, 5))
                .valorAdquisicion(new BigDecimal("4800.00"))
                .vidaUtilAnios(10)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catMobiliario)
                .areaActual(areaTI)
                .ubicacion("Oficina TI — Piso 2")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("MOB-2022-002")
                .nombre("Archivador Metálico de 4 Cajones")
                .descripcion("Archivador con llave, capacidad A4")
                .fechaAdquisicion(LocalDate.of(2022, 5, 18))
                .valorAdquisicion(new BigDecimal("1200.00"))
                .vidaUtilAnios(10)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catMobiliario)
                .areaActual(areaContab)
                .ubicacion("Contabilidad — Piso 1")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("MOB-2023-003")
                .nombre("Mesa de Reuniones Ejecutiva 12 personas")
                .descripcion("Mesa de conferencias con sistema de gestión de cables integrado")
                .fechaAdquisicion(LocalDate.of(2023, 3, 22))
                .valorAdquisicion(new BigDecimal("6800.00"))
                .vidaUtilAnios(10)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catMobiliario)
                .areaActual(areaAdmin)
                .ubicacion("Sala de Reuniones — Piso 3")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("MOB-2024-004")
                .nombre("Sillón Ejecutivo Herman Miller Aeron")
                .descripcion("Silla ergonómica premium para gerencia")
                .fechaAdquisicion(LocalDate.of(2024, 4, 10))
                .valorAdquisicion(new BigDecimal("3500.00"))
                .vidaUtilAnios(10)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catMobiliario)
                .areaActual(areaAdmin)
                .ubicacion("Oficina Gerencia — Piso 3")
                .build());

        // —— Vehículos ——
        activoRepository.save(Activo.builder()
                .codigo("VEH-2021-001")
                .nombre("Toyota Hilux 4x4 2021")
                .descripcion("Camioneta doble cabina para operaciones de campo")
                .fechaAdquisicion(LocalDate.of(2021, 4, 12))
                .valorAdquisicion(new BigDecimal("85000.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catVehiculos)
                .areaActual(areaLog)
                .ubicacion("Parqueo — Planta Baja")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("VEH-2019-002")
                .nombre("Nissan Frontier 4x2 2019")
                .descripcion("Camioneta para distribución y logística")
                .fechaAdquisicion(LocalDate.of(2019, 9, 3))
                .valorAdquisicion(new BigDecimal("62000.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.TRANSFERIDO)
                .categoria(catVehiculos)
                .areaActual(areaAdmin)
                .ubicacion("Parqueo Administrativo — Piso -1")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("VEH-2023-003")
                .nombre("Toyota Land Cruiser 200 2023")
                .descripcion("SUV ejecutivo para visitas institucionales")
                .fechaAdquisicion(LocalDate.of(2023, 11, 15))
                .valorAdquisicion(new BigDecimal("120000.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catVehiculos)
                .areaActual(areaAdmin)
                .ubicacion("Parqueo Administrativo — Piso -1")
                .build());

        // —— Maquinaria ——
        activoRepository.save(Activo.builder()
                .codigo("MAQ-2020-001")
                .nombre("Compresor Industrial Atlas Copco GA15")
                .descripcion("Compresor de tornillo rotativo 15kW")
                .fechaAdquisicion(LocalDate.of(2020, 2, 28))
                .valorAdquisicion(new BigDecimal("28000.00"))
                .vidaUtilAnios(10)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catMaquinaria)
                .areaActual(areaLog)
                .ubicacion("Almacén Central — Sector B")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("MAQ-2022-002")
                .nombre("Generador Diésel Cummins 50kVA")
                .descripcion("Grupo electrógeno de emergencia para planta principal")
                .fechaAdquisicion(LocalDate.of(2022, 9, 8))
                .valorAdquisicion(new BigDecimal("35000.00"))
                .vidaUtilAnios(10)
                .estado(EstadoActivo.EN_MANTENIMIENTO)
                .categoria(catMaquinaria)
                .areaActual(areaLog)
                .ubicacion("Sala de Máquinas — Subsuelo")
                .build());

        // —— Infraestructura de Red ——
        activoRepository.save(Activo.builder()
                .codigo("RED-2024-001")
                .nombre("Switch Cisco Catalyst 9300-48P")
                .descripcion("Switch de distribución 48 puertos PoE+ con soporte SD-Access")
                .fechaAdquisicion(LocalDate.of(2024, 6, 20))
                .valorAdquisicion(new BigDecimal("18500.00"))
                .vidaUtilAnios(7)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catInfraestructura)
                .areaActual(areaTI)
                .ubicacion("Sala de Servidores — Rack A1")
                .build());

        activoRepository.save(Activo.builder()
                .codigo("RED-2024-002")
                .nombre("Firewall Fortinet FortiGate 200F")
                .descripcion("Next-generation firewall para protección perimetral")
                .fechaAdquisicion(LocalDate.of(2024, 7, 3))
                .valorAdquisicion(new BigDecimal("22000.00"))
                .vidaUtilAnios(5)
                .estado(EstadoActivo.ACTIVO)
                .categoria(catInfraestructura)
                .areaActual(areaTI)
                .ubicacion("Sala de Servidores — Rack A1")
                .build());

        log.info("DataInitializer: 18 activos de ejemplo cargados");
    }

    // ─── Responsables ─────────────────────────────────────────────────────────
    private void seedResponsables() {
        crearOActualizarResponsableBorys();
        if (responsableRepository.count() > 1) {
            log.info("DataInitializer: responsables ya existen, omitiendo seed");
            return;
        }
        responsableRepository.save(Responsable.builder()
                .nombre("Roberto Méndez Solíz")
                .cargo("Director de Tecnologías de Información")
                .email("r.mendez@empresa.bo")
                .telefono("+591 76543210")
                .build());

        responsableRepository.save(Responsable.builder()
                .nombre("Laura Gutiérrez Vaca")
                .cargo("Gerente General")
                .email("l.gutierrez@empresa.bo")
                .telefono("+591 77123456")
                .build());

        responsableRepository.save(Responsable.builder()
                .nombre("Carlos Quispe Mamani")
                .cargo("Jefe de Logística y Operaciones")
                .email("c.quispe@empresa.bo")
                .telefono("+591 78901234")
                .build());

        responsableRepository.save(Responsable.builder()
                .nombre("Ana Torrez Ferrufino")
                .cargo("Contadora General")
                .email("a.torrez@empresa.bo")
                .telefono("+591 79012345")
                .build());

        responsableRepository.save(Responsable.builder()
                .nombre("Mario Flores Suárez")
                .cargo("Jefe de Recursos Humanos")
                .email("m.flores@empresa.bo")
                .telefono("+591 75678901")
                .build());

        log.info("DataInitializer: 5 responsables creados");
    }

    // ─── Asignaciones ─────────────────────────────────────────────────────────
    private void seedAsignaciones() {
        if (asignacionRepository.count() > 0) {
            log.info("DataInitializer: asignaciones ya existen, omitiendo seed");
            return;
        }
        var mendez = responsableRepository.findByEmail("r.mendez@empresa.bo").orElse(null);
        var laura = responsableRepository.findByEmail("l.gutierrez@empresa.bo").orElse(null);
        var carlos = responsableRepository.findByEmail("c.quispe@empresa.bo").orElse(null);
        var ana = responsableRepository.findByEmail("a.torrez@empresa.bo").orElse(null);
        var mario = responsableRepository.findByEmail("m.flores@empresa.bo").orElse(null);
        if (mendez == null) {
            return;
        }

        var areaTI = areaRepository.findByCodigo("TI-001").orElse(null);
        var areaAdmin = areaRepository.findByCodigo("ADM-001").orElse(null);
        var areaLog = areaRepository.findByCodigo("LOG-001").orElse(null);
        var areaContab = areaRepository.findByCodigo("CONT-001").orElse(null);
        var areaRRHH = areaRepository.findByCodigo("RRHH-001").orElseGet(()
                -> areaRepository.save(Area.builder()
                        .codigo("RRHH-001")
                        .nombre("Recursos Humanos")
                        .descripcion("Gestión del talento humano y nómina")
                        .build()));
        if (areaTI == null) {
            return;
        }

        // Servidor Dell → Roberto Méndez (TI) — activa (CU-10, CU-14)
        activoRepository.findByCodigo("EQ-2022-001").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(mendez).area(areaTI)
                        .fechaAsignacion(LocalDate.of(2022, 3, 20))
                        .observaciones("Asignación inicial — administración de base de datos corporativa")
                        .activa(true).build()));

        // MacBook Pro → Roberto Méndez (TI) — activa
        activoRepository.findByCodigo("EQ-2024-005").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(mendez).area(areaTI)
                        .fechaAsignacion(LocalDate.of(2024, 1, 15))
                        .observaciones("Uso exclusivo para desarrollo y arquitectura de sistemas")
                        .activa(true).build()));

        // Monitor LG → Roberto Méndez (TI) — activa
        activoRepository.findByCodigo("EQ-2023-006").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(mendez).area(areaTI)
                        .fechaAsignacion(LocalDate.of(2023, 8, 15))
                        .observaciones("Monitor asignado a estación de desarrollo principal")
                        .activa(true).build()));

        // Laptop HP → Laura Gutiérrez (Admin) — activa
        activoRepository.findByCodigo("EQ-2023-002").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(laura).area(areaAdmin)
                        .fechaAsignacion(LocalDate.of(2023, 2, 1))
                        .observaciones("Laptop gerencial para trabajo remoto")
                        .activa(true).build()));

        // Mesa de Reuniones → Laura Gutiérrez (Admin) — activa
        activoRepository.findByCodigo("MOB-2023-003").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(laura).area(areaAdmin)
                        .fechaAsignacion(LocalDate.of(2023, 4, 1))
                        .observaciones("Sala de reuniones — directorio")
                        .activa(true).build()));

        // Sillón Ejecutivo → Laura Gutiérrez (Admin) — activa
        activoRepository.findByCodigo("MOB-2024-004").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(laura).area(areaAdmin)
                        .fechaAsignacion(LocalDate.of(2024, 4, 15))
                        .observaciones("Silla gerencial — oficina principal")
                        .activa(true).build()));

        // Toyota Hilux → Carlos Quispe (Log) — activa (CU-17: reporte por responsable)
        activoRepository.findByCodigo("VEH-2021-001").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(carlos).area(areaLog)
                        .fechaAsignacion(LocalDate.of(2021, 5, 1))
                        .observaciones("Vehículo para distribución y visitas a proveedores")
                        .activa(true).build()));

        // Compresor Industrial → Carlos Quispe (Log) — activa
        activoRepository.findByCodigo("MAQ-2020-001").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(carlos).area(areaLog)
                        .fechaAsignacion(LocalDate.of(2021, 1, 10))
                        .observaciones("Uso en línea de embalaje y almacén")
                        .activa(true).build()));

        // Archivador Metálico → Ana Torrez (Contab) — activa
        activoRepository.findByCodigo("MOB-2022-002").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(ana).area(areaContab)
                        .fechaAsignacion(LocalDate.of(2022, 6, 1))
                        .observaciones("Archivo de documentos contables y estados financieros")
                        .activa(true).build()));

        // Estación de Trabajo → Mario Flores (RRHH) — devuelta (CU-11, CU-15: historial)
        activoRepository.findByCodigo("MOB-2020-001").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(mario).area(areaRRHH)
                        .fechaAsignacion(LocalDate.of(2020, 11, 10))
                        .fechaDevolucion(LocalDate.of(2023, 12, 31))
                        .observaciones("Reasignada al área TI por remodelación de RRHH")
                        .activa(false).build()));

        // Estación de Trabajo → Roberto Méndez (TI) — activa (reasignación posterior)
        activoRepository.findByCodigo("MOB-2020-001").ifPresent(a -> asignacionRepository.save(
                Asignacion.builder().activo(a).responsable(mendez).area(areaTI)
                        .fechaAsignacion(LocalDate.of(2024, 1, 5))
                        .observaciones("Reasignada a TI tras remodelación de RRHH")
                        .activa(true).build()));

        log.info("DataInitializer: 11 asignaciones creadas (10 activas, 1 histórica)");
    }

    private void seedBorysDemo() {
        var borys = crearOActualizarResponsableBorys();
        var areaTI = areaRepository.findByCodigo("TI-001").orElseGet(()
                -> areaRepository.save(Area.builder()
                        .codigo("TI-001")
                        .nombre("Tecnologías de Información")
                        .descripcion("Área de sistemas y soporte tecnológico")
                        .responsable(borys)
                        .build()));
        areaTI.setResponsable(borys);
        areaRepository.save(areaTI);

        var categoriaEquipos = categoriaRepository.findByNombre("Equipos de Cómputo")
                .orElseGet(() -> categoriaRepository.save(CategoriaActivo.builder()
                        .nombre("Equipos de Cómputo")
                        .descripcion("Computadoras, laptops, servidores y periféricos")
                        .metodoDepreciacion(MetodoDepreciacion.LINEAL)
                        .tasaDepreciacion(0.25)
                        .build()));

        var laptop = crearActivoDemoBorysSiNoExiste(
                "ACT-2024-001",
                "Laptop Dell Latitude 7440",
                "Equipo demo para validar solicitudes WhatsApp/N8N/email con usuario registrado",
                categoriaEquipos,
                areaTI,
                "Oficina TI - Puesto Borys",
                new BigDecimal("9800.00"),
                LocalDate.of(2024, 7, 10));

        var monitor = crearActivoDemoBorysSiNoExiste(
                "ACT-2024-002",
                "Monitor Dell UltraSharp 27",
                "Monitor demo asignado a Borys para pruebas de acceso por WhatsApp",
                categoriaEquipos,
                areaTI,
                "Oficina TI - Puesto Borys",
                new BigDecimal("3100.00"),
                LocalDate.of(2024, 7, 10));

        asegurarAsignacionActivaBorys(laptop, borys, areaTI, LocalDate.of(2024, 7, 11));
        asegurarAsignacionActivaBorys(monitor, borys, areaTI, LocalDate.of(2024, 7, 11));

        log.info("DataInitializer: usuario/responsable Borys Quiroga y activos demo verificados");
    }

    // ─── Traslados ────────────────────────────────────────────────────────────
    private void seedTraslados() {
        if (trasladoRepository.count() > 0) {
            log.info("DataInitializer: traslados ya existen, omitiendo seed");
            return;
        }
        var admin = usuarioRepository.findByUsername("admin").orElse(null);
        var supervisor = usuarioRepository.findByUsername("supervisor").orElse(null);
        if (admin == null) {
            return;
        }

        var areaTI = areaRepository.findByCodigo("TI-001").orElse(null);
        var areaAdmin = areaRepository.findByCodigo("ADM-001").orElse(null);
        var areaLog = areaRepository.findByCodigo("LOG-001").orElse(null);
        var areaContab = areaRepository.findByCodigo("CONT-001").orElse(null);
        if (areaTI == null) {
            return;
        }

        // Laptop HP: Admin → TI (confirmado — para CU-13/CU-16)
        activoRepository.findByCodigo("EQ-2023-002").ifPresent(a -> trasladoRepository.save(
                Traslado.builder().activo(a)
                        .areaOrigen(areaAdmin).areaDestino(areaTI)
                        .autorizadoPor(admin).fecha(LocalDate.of(2023, 6, 15))
                        .motivoTraslado("Reubicación por reorganización de oficinas — gerencia usa equipos cloud")
                        .recepcionConfirmada(true).build()));

        // Nissan Frontier: Log → Admin (confirmado — traslado permanente)
        activoRepository.findByCodigo("VEH-2019-002").ifPresent(a -> trasladoRepository.save(
                Traslado.builder().activo(a)
                        .areaOrigen(areaLog).areaDestino(areaAdmin)
                        .autorizadoPor(admin).fecha(LocalDate.of(2023, 9, 1))
                        .motivoTraslado("Traslado permanente para uso de gerencia administrativa")
                        .recepcionConfirmada(true).build()));

        // Impresora HP: Admin → Contab (confirmado — traslado temporal)
        activoRepository.findByCodigo("EQ-2021-003").ifPresent(a -> trasladoRepository.save(
                Traslado.builder().activo(a)
                        .areaOrigen(areaAdmin).areaDestino(areaContab)
                        .autorizadoPor(supervisor != null ? supervisor : admin)
                        .fecha(LocalDate.of(2024, 2, 10))
                        .motivoTraslado("Traslado temporal para proceso de cierre contable anual")
                        .recepcionConfirmada(true).build()));

        // UPS APC: TI → Log — pendiente de confirmación (para probar CU-13: autorizar traslado)
        activoRepository.findByCodigo("EQ-2025-007").ifPresent(a -> trasladoRepository.save(
                Traslado.builder().activo(a)
                        .areaOrigen(areaTI).areaDestino(areaLog)
                        .autorizadoPor(admin).fecha(LocalDate.of(2025, 5, 20))
                        .motivoTraslado("Prueba de backup eléctrico en almacén — traslado temporal pendiente")
                        .recepcionConfirmada(false).build()));

        log.info("DataInitializer: 4 traslados creados (3 confirmados, 1 pendiente de confirmación)");
    }

    // ─── Bajas ────────────────────────────────────────────────────────────────
    private void seedBajas() {
        if (bajaRepository.count() > 0) {
            log.info("DataInitializer: bajas ya existen, omitiendo seed");
            return;
        }
        var admin = usuarioRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            return;
        }

        // Switch Cisco DADO_DE_BAJA → registro formal de baja (CU-22, CU-23, CU-24)
        activoRepository.findByCodigo("EQ-2018-004").ifPresent(activo -> {
            if (!bajaRepository.existsByActivoId(activo.getId())) {
                bajaRepository.save(Baja.builder()
                        .activo(activo)
                        .autorizadoPor(admin)
                        .fecha(LocalDate.of(2023, 7, 1))
                        .motivo("Obsolescencia tecnológica — vida útil cumplida al 100%. "
                                + "Reemplazado por Switch Cisco Catalyst 9300-48P (RED-2024-001). "
                                + "Equipo sin posibilidad de actualización ni valor de reventa.")
                        .valorResidual(BigDecimal.ZERO)
                        .numeroResolucion("RES-TI-2023-001")
                        .autorizada(true)
                        .build());
                log.info("DataInitializer: baja registrada para EQ-2018-004 (Switch Cisco 2960-X)");
            }
        });
    }

    // ─── Registros Blockchain (simulados para entorno de desarrollo) ──────────
    private void seedBlockchain() {
        if (blockchainRepository.count() > 0) {
            log.info("DataInitializer: registros blockchain ya existen, omitiendo seed");
            return;
        }

        // EQ-2022-001 — Servidor Dell: REGISTRO + ASIGNACION (CU-75, CU-76)
        activoRepository.findByCodigo("EQ-2022-001").ifPresent(activo -> {
            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x3a7f2c9e1b4d8f0a5c2e6b9d3f7a1c4e8b2d5f0a3c6e9b2d5f8a1c4e7b0d3f6")
                    .tipoTransaccion(TipoTransaccionBlockchain.REGISTRO)
                    .payload("{\"codigo\":\"EQ-2022-001\",\"nombre\":\"Servidor Dell PowerEdge R740\",\"valor\":45000,\"fecha\":\"2022-03-15\"}")
                    .bloqueId("18742301").timestamp(LocalDateTime.of(2022, 3, 15, 10, 30, 0)).build());

            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x9c1e5b3a7f2d8e0b4c6a2e8b3d7f1c5e9b0d4f8a2c6e0b4d8f2a6c0e4b8d2f6")
                    .tipoTransaccion(TipoTransaccionBlockchain.ASIGNACION)
                    .payload("{\"codigo\":\"EQ-2022-001\",\"responsable\":\"Roberto Mendez Soliz\",\"area\":\"TI-001\",\"fecha\":\"2022-03-20\"}")
                    .bloqueId("18752488").timestamp(LocalDateTime.of(2022, 3, 20, 9, 15, 0)).build());
        });

        // EQ-2023-002 — Laptop HP: REGISTRO + ASIGNACION + TRASLADO (CU-75, CU-76, CU-77)
        activoRepository.findByCodigo("EQ-2023-002").ifPresent(activo -> {
            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x5d2a9f4c8e1b7d3a6f0c4e8b2d5f9a1c7e3b6d0f4a8c2e6b0d4f8a2c6e0b4d")
                    .tipoTransaccion(TipoTransaccionBlockchain.REGISTRO)
                    .payload("{\"codigo\":\"EQ-2023-002\",\"nombre\":\"Laptop HP EliteBook 840 G9\",\"valor\":9500,\"fecha\":\"2023-01-20\"}")
                    .bloqueId("19015672").timestamp(LocalDateTime.of(2023, 1, 20, 11, 0, 0)).build());

            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0xb4f8a2c6e0d4b8f2a6c0e4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4")
                    .tipoTransaccion(TipoTransaccionBlockchain.ASIGNACION)
                    .payload("{\"codigo\":\"EQ-2023-002\",\"responsable\":\"Laura Gutierrez Vaca\",\"area\":\"ADM-001\",\"fecha\":\"2023-02-01\"}")
                    .bloqueId("19028934").timestamp(LocalDateTime.of(2023, 2, 1, 14, 30, 0)).build());

            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x2e6b0d4f8a2c6e0b4d8f2a6c0e4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e")
                    .tipoTransaccion(TipoTransaccionBlockchain.TRASLADO)
                    .payload("{\"codigo\":\"EQ-2023-002\",\"origen\":\"ADM-001\",\"destino\":\"TI-001\",\"motivo\":\"Reorganizacion de oficinas\",\"fecha\":\"2023-06-15\"}")
                    .bloqueId("19213745").timestamp(LocalDateTime.of(2023, 6, 15, 16, 45, 0)).build());
        });

        // EQ-2024-005 — MacBook Pro: REGISTRO + ASIGNACION
        activoRepository.findByCodigo("EQ-2024-005").ifPresent(activo -> {
            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x7a1c4e8b2d5f9a3c7e1b5d9f3a7c1e5b9d3f7a1c5e9b3d7f1a5c9e3b7d1f5a")
                    .tipoTransaccion(TipoTransaccionBlockchain.REGISTRO)
                    .payload("{\"codigo\":\"EQ-2024-005\",\"nombre\":\"MacBook Pro M3 14 pulgadas\",\"valor\":12500,\"fecha\":\"2024-01-08\"}")
                    .bloqueId("19687234").timestamp(LocalDateTime.of(2024, 1, 8, 9, 0, 0)).build());

            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0xc4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0b4d8f2a6c0e4b8d2f6a0c4")
                    .tipoTransaccion(TipoTransaccionBlockchain.ASIGNACION)
                    .payload("{\"codigo\":\"EQ-2024-005\",\"responsable\":\"Roberto Mendez Soliz\",\"area\":\"TI-001\",\"fecha\":\"2024-01-15\"}")
                    .bloqueId("19691857").timestamp(LocalDateTime.of(2024, 1, 15, 10, 20, 0)).build());
        });

        // VEH-2021-001 — Toyota Hilux: REGISTRO + ASIGNACION
        activoRepository.findByCodigo("VEH-2021-001").ifPresent(activo -> {
            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x1b5d9f3a7c1e5b9d3f7a1c5e9b3d7f1a5c9e3b7d1f5a9c3e7b1d5f9a3c7e1b")
                    .tipoTransaccion(TipoTransaccionBlockchain.REGISTRO)
                    .payload("{\"codigo\":\"VEH-2021-001\",\"nombre\":\"Toyota Hilux 4x4 2021\",\"valor\":85000,\"fecha\":\"2021-04-12\"}")
                    .bloqueId("18342156").timestamp(LocalDateTime.of(2021, 4, 12, 8, 0, 0)).build());

            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0xd8f2a6c0e4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0b4d8")
                    .tipoTransaccion(TipoTransaccionBlockchain.ASIGNACION)
                    .payload("{\"codigo\":\"VEH-2021-001\",\"responsable\":\"Carlos Quispe Mamani\",\"area\":\"LOG-001\",\"fecha\":\"2021-05-01\"}")
                    .bloqueId("18357423").timestamp(LocalDateTime.of(2021, 5, 1, 9, 0, 0)).build());
        });

        // VEH-2019-002 — Nissan Frontier: TRASLADO Log → Admin (CU-77)
        activoRepository.findByCodigo("VEH-2019-002").ifPresent(activo
                -> blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                        .hash("0xe0b4d8f2a6c0e4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0")
                        .tipoTransaccion(TipoTransaccionBlockchain.TRASLADO)
                        .payload("{\"codigo\":\"VEH-2019-002\",\"origen\":\"LOG-001\",\"destino\":\"ADM-001\",\"motivo\":\"Traslado permanente gerencia\",\"fecha\":\"2023-09-01\"}")
                        .bloqueId("19334912").timestamp(LocalDateTime.of(2023, 9, 1, 11, 30, 0)).build()));

        // EQ-2021-003 — Impresora HP: MANTENIMIENTO (CU-79: diagnóstico crítico IA)
        activoRepository.findByCodigo("EQ-2021-003").ifPresent(activo
                -> blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                        .hash("0xf6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0b4d8f2a6c0e4b8d2f6")
                        .tipoTransaccion(TipoTransaccionBlockchain.MANTENIMIENTO)
                        .payload("{\"codigo\":\"EQ-2021-003\",\"tipo\":\"Mantenimiento preventivo\",\"diagnostico\":\"Falla en sistema de alimentacion\",\"fecha\":\"2024-01-15\"}")
                        .bloqueId("19678234").timestamp(LocalDateTime.of(2024, 1, 15, 13, 0, 0)).build()));

        // EQ-2018-004 — Switch Cisco: REGISTRO + BAJA (CU-75, CU-78, CU-80, CU-81)
        activoRepository.findByCodigo("EQ-2018-004").ifPresent(activo -> {
            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0xa2c6e0b4d8f2a6c0e4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2")
                    .tipoTransaccion(TipoTransaccionBlockchain.REGISTRO)
                    .payload("{\"codigo\":\"EQ-2018-004\",\"nombre\":\"Switch Cisco Catalyst 2960-X\",\"valor\":7500,\"fecha\":\"2018-06-01\"}")
                    .bloqueId("15234891").timestamp(LocalDateTime.of(2018, 6, 1, 10, 0, 0)).build());

            blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                    .hash("0x8b2d5f0a3c6e9b2d5f8a1c4e7b0d3f6a9c1e5b3a7f2d8e0b4c6a2e8b3d7f1c")
                    .tipoTransaccion(TipoTransaccionBlockchain.BAJA)
                    .payload("{\"codigo\":\"EQ-2018-004\",\"motivo\":\"Obsolescencia tecnologica\",\"resolucion\":\"RES-TI-2023-001\",\"valorResidual\":0,\"fecha\":\"2023-07-01\"}")
                    .bloqueId("19224567").timestamp(LocalDateTime.of(2023, 7, 1, 9, 0, 0)).build());
        });

        // MAQ-2022-002 — Generador Diésel: MANTENIMIENTO con diagnóstico IA (CU-79)
        activoRepository.findByCodigo("MAQ-2022-002").ifPresent(activo
                -> blockchainRepository.save(RegistroBlockchain.builder().activo(activo)
                        .hash("0x6c9e3b7d1f5a9c3e7b1d5f9a3c7e1b5d9f3a7c1e5b9d3f7a1c5e9b3d7f1a5c")
                        .tipoTransaccion(TipoTransaccionBlockchain.MANTENIMIENTO)
                        .payload("{\"codigo\":\"MAQ-2022-002\",\"tipo\":\"Mantenimiento correctivo\",\"diagnostico\":\"Falla en inyectores — estado DETERIORADO detectado por IA\",\"fecha\":\"2025-03-10\"}")
                        .bloqueId("20123456").timestamp(LocalDateTime.of(2025, 3, 10, 14, 30, 0)).build()));

        log.info("DataInitializer: registros blockchain simulados cargados");
    }

    private void crearUsuarioSiNoExiste(String username, String email,
            String password, RolUsuario rol) {
        if (!usuarioRepository.existsByUsername(username)) {
            usuarioRepository.save(Usuario.builder()
                    .username(username)
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .rol(rol)
                    .activo(true)
                    .build());
            log.info("Usuario demo creado: {} ({})", username, rol);
        }
    }

    private Usuario crearOActualizarUsuario(String username, String email,
            String password, RolUsuario rol) {
        var usuario = usuarioRepository.findByUsername(username)
                .or(() -> usuarioRepository.findByEmail(email))
                .orElseGet(() -> Usuario.builder()
                .username(username)
                .email(email)
                .build());

        usuario.setUsername(username);
        usuario.setEmail(email);
        usuario.setRol(rol);
        usuario.setActivo(true);
        if (usuario.getPasswordHash() == null || !passwordEncoder.matches(password, usuario.getPasswordHash())) {
            usuario.setPasswordHash(passwordEncoder.encode(password));
        }

        return usuarioRepository.save(usuario);
    }

    private Responsable crearOActualizarResponsableBorys() {
        var responsable = responsableRepository.findByEmail(BORYS_EMAIL)
                .orElseGet(() -> Responsable.builder()
                .nombre("Borys Quiroga")
                .cargo("Responsable de Área")
                .email(BORYS_EMAIL)
                .build());

        responsable.setNombre("Borys Quiroga");
        responsable.setCargo("Responsable de Área");
        responsable.setEmail(BORYS_EMAIL);
        responsable.setTelefono(BORYS_PHONE);
        return responsableRepository.save(responsable);
    }

    private Activo crearActivoDemoBorysSiNoExiste(String codigo, String nombre, String descripcion,
            CategoriaActivo categoria, Area area, String ubicacion, BigDecimal valor, LocalDate fechaAdquisicion) {
        var activo = activoRepository.findByCodigo(codigo)
                .orElseGet(() -> Activo.builder()
                .codigo(codigo)
                .nombre(nombre)
                .descripcion(descripcion)
                .fechaAdquisicion(fechaAdquisicion)
                .valorAdquisicion(valor)
                .vidaUtilAnios(4)
                .estado(EstadoActivo.ACTIVO)
                .categoria(categoria)
                .areaActual(area)
                .ubicacion(ubicacion)
                .build());

        activo.setNombre(nombre);
        activo.setDescripcion(descripcion);
        activo.setCategoria(categoria);
        activo.setAreaActual(area);
        activo.setUbicacion(ubicacion);
        activo.setEstado(EstadoActivo.ACTIVO);
        return activoRepository.save(activo);
    }

    private void asegurarAsignacionActivaBorys(Activo activo, Responsable borys, Area area, LocalDate fecha) {
        var asignacionActiva = asignacionRepository.findByActivoIdAndActivaTrue(activo.getId());
        if (asignacionActiva.isPresent()
                && asignacionActiva.get().getResponsable().getId().equals(borys.getId())) {
            var asignacion = asignacionActiva.get();
            asignacion.setArea(area);
            asignacion.setObservaciones("Asignación demo para validar WhatsApp/N8N/email con usuario registrado");
            asignacionRepository.save(asignacion);
            return;
        }

        asignacionActiva.ifPresent(asignacion -> {
            asignacion.setActiva(false);
            asignacion.setFechaDevolucion(fecha.minusDays(1));
            asignacionRepository.save(asignacion);
        });

        asignacionRepository.save(Asignacion.builder()
                .activo(activo)
                .responsable(borys)
                .area(area)
                .fechaAsignacion(fecha)
                .observaciones("Asignación demo para validar WhatsApp/N8N/email con usuario registrado")
                .activa(true)
                .build());
    }

    private void crearOActualizarAdminConfigurado() {
        var email = adminUsername.contains("@") ? adminUsername : adminUsername + "@saf.bo";
        var admin = usuarioRepository.findByUsername(adminUsername)
                .orElseGet(() -> Usuario.builder()
                .username(adminUsername)
                .email(email)
                .build());

        admin.setEmail(email);
        admin.setRol(RolUsuario.ADMINISTRADOR);
        admin.setActivo(true);
        if (admin.getPasswordHash() == null || !passwordEncoder.matches(adminPassword, admin.getPasswordHash())) {
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        }

        usuarioRepository.save(admin);
        log.info("Usuario administrador configurado verificado: {}", adminUsername);
    }
}
