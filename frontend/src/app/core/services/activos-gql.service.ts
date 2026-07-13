import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { catchError, filter, map, throwError } from 'rxjs';
import * as Q from '../graphql/queries';
import type {
  Activo,
  DashboardMetricasDTO,
  RegistroBlockchain,
  ReporteDepreciacionDTO,
  ProyeccionVidaUtilDTO,
  ActivoInput,
  FiltroActivoInput,
  Asignacion,
  Traslado,
  Baja,
  Usuario,
  CategoriaActivo,
  Area,
  Responsable,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ActivosGqlService {
  constructor(private apollo: Apollo) {}

  // ── Activos ─────────────────────────────────────────────────────────────

  getActivos(filtro?: FiltroActivoInput): Observable<Activo[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_ACTIVOS, variables: { filtro }, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.activos != null),
        map((r: any) => r.data.activos as Activo[]),
      );
  }

  getActivo(id: string): Observable<Activo> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_ACTIVO, variables: { id }, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.activo != null),
        map((r: any) => r.data.activo as Activo),
      );
  }

  getActivosPorArea(areaId: string): Observable<Activo[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_ACTIVOS_POR_AREA,
        variables: { areaId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.activosPorArea != null),
        map((r: any) => r.data.activosPorArea as Activo[]),
      );
  }

  getActivosPorResponsable(responsableId: string): Observable<Activo[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_ACTIVOS_POR_RESPONSABLE,
        variables: { responsableId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.activosPorResponsable != null),
        map((r: any) => r.data.activosPorResponsable as Activo[]),
      );
  }

  registrarActivo(input: ActivoInput): Observable<Activo> {
    return this.apollo
      .mutate<{ registrarActivo: Activo }>({
        mutation: Q.REGISTRAR_ACTIVO,
        variables: { input },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.registrarActivo));
  }

  actualizarActivo(id: string, input: ActivoInput): Observable<Activo> {
    return this.apollo
      .mutate<{ actualizarActivo: Activo }>({
        mutation: Q.ACTUALIZAR_ACTIVO,
        variables: { id, input },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.actualizarActivo));
  }

  cambiarEstadoActivo(activoId: string, nuevoEstado: string): Observable<Activo> {
    return this.apollo
      .mutate<{ cambiarEstadoActivo: Activo }>({
        mutation: Q.CAMBIAR_ESTADO_ACTIVO,
        variables: { activoId, nuevoEstado },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.cambiarEstadoActivo));
  }

  // ── Dashboard y Reportes ─────────────────────────────────────────────────

  getDashboardBI(): Observable<DashboardMetricasDTO> {
    return this.apollo.query<any>({ query: Q.GET_DASHBOARD_BI, fetchPolicy: 'network-only' }).pipe(
      map((r: any) => r.data?.dashboardBI as DashboardMetricasDTO),
      filter((d): d is DashboardMetricasDTO => d != null),
      catchError((err) => throwError(() => err)),
    );
  }

  getHistorialBlockchain(activoId: string): Observable<RegistroBlockchain[]> {
    return this.apollo
      .query<any>({
        query: Q.GET_HISTORIAL_BLOCKCHAIN,
        variables: { activoId },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((r: any) => r.data.historialBlockchain as RegistroBlockchain[]),
        catchError((err) => throwError(() => err)),
      );
  }

  getReporteDepreciacion(anio: number): Observable<ReporteDepreciacionDTO> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_REPORTE_DEPRECIACION,
        variables: { anio },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.reporteDepreciacion != null),
        map((r: any) => r.data.reporteDepreciacion as ReporteDepreciacionDTO),
      );
  }

  // ── Asignaciones ─────────────────────────────────────────────────────────

  getAsignacionesPorActivo(activoId: string): Observable<Asignacion[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_ASIGNACIONES_POR_ACTIVO,
        variables: { activoId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.asignacionesPorActivo != null),
        map((r: any) => r.data.asignacionesPorActivo as Asignacion[]),
      );
  }

  getAsignacionesPorResponsable(responsableId: string): Observable<Asignacion[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_ASIGNACIONES_POR_RESPONSABLE,
        variables: { responsableId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.asignacionesPorResponsable != null),
        map((r: any) => r.data.asignacionesPorResponsable as Asignacion[]),
      );
  }

  asignarActivo(input: {
    activoId: string;
    responsableId: string;
    areaId: string;
    fechaAsignacion: string;
    observaciones?: string;
  }): Observable<Asignacion> {
    return this.apollo
      .mutate<{ asignarActivo: Asignacion }>({
        mutation: Q.ASIGNAR_ACTIVO,
        variables: { input },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.asignarActivo));
  }

  devolverActivo(asignacionId: string): Observable<Asignacion> {
    return this.apollo
      .mutate<{ devolverActivo: Asignacion }>({
        mutation: Q.DEVOLVER_ACTIVO,
        variables: { asignacionId },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.devolverActivo));
  }

  // ── Traslados ─────────────────────────────────────────────────────────────

  getTrasladosPorActivo(activoId: string): Observable<Traslado[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_TRASLADOS_POR_ACTIVO,
        variables: { activoId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.trasladosPorActivo != null),
        map((r: any) => r.data.trasladosPorActivo as Traslado[]),
      );
  }

  trasladarActivo(input: {
    activoId: string;
    areaDestinoId: string;
    autorizadoPorId: string;
    fecha: string;
    motivoTraslado: string;
  }): Observable<Traslado> {
    return this.apollo
      .mutate<{ trasladarActivo: Traslado }>({
        mutation: Q.TRASLADAR_ACTIVO,
        variables: { input },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.trasladarActivo));
  }

  confirmarRecepcion(trasladoId: string): Observable<Traslado> {
    return this.apollo
      .mutate<{ confirmarRecepcionActivo: Traslado }>({
        mutation: Q.CONFIRMAR_RECEPCION,
        variables: { trasladoId },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.confirmarRecepcionActivo));
  }

  // ── Bajas ─────────────────────────────────────────────────────────────────

  getBajaPorActivo(activoId: string): Observable<Baja> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_BAJA_POR_ACTIVO,
        variables: { activoId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.bajaPorActivo != null),
        map((r: any) => r.data.bajaPorActivo as Baja),
      );
  }

  getBajas(): Observable<Baja[]> {
    return this.apollo.query<any>({ query: Q.GET_BAJAS, fetchPolicy: 'network-only' }).pipe(
      map((r: any) => (r.data?.bajas ?? []) as Baja[]),
      catchError((err) => throwError(() => err)),
    );
  }

  darDeBaja(input: {
    activoId: string;
    autorizadoPorId: string;
    motivo: string;
    valorResidual?: number;
    numeroResolucion?: string;
  }): Observable<Baja> {
    return this.apollo
      .mutate<{ darDeBajaActivo: Baja }>({
        mutation: Q.DAR_DE_BAJA,
        variables: { input },
        refetchQueries: [{ query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.darDeBajaActivo));
  }

  registrarBaja(input: {
    activoId: string;
    autorizadoPorId: string;
    motivo: string;
    valorResidual?: number;
    numeroResolucion?: string;
  }): Observable<Baja> {
    return this.apollo
      .mutate<{ registrarBajaActivo: Baja }>({
        mutation: Q.REGISTRAR_BAJA,
        variables: { input },
        refetchQueries: [{ query: Q.GET_BAJAS }, { query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.registrarBajaActivo));
  }

  autorizarBaja(bajaId: string, autorizadoPorId: string): Observable<Baja> {
    return this.apollo
      .mutate<{ autorizarBajaActivo: Baja }>({
        mutation: Q.AUTORIZAR_BAJA,
        variables: { bajaId, autorizadoPorId },
        refetchQueries: [{ query: Q.GET_BAJAS }, { query: Q.GET_ACTIVOS }],
      })
      .pipe(map((r) => r.data!.autorizarBajaActivo));
  }

  // ── Usuarios ─────────────────────────────────────────────────────────────

  getUsuarios(): Observable<Usuario[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_USUARIOS, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.usuarios != null),
        map((r: any) => r.data.usuarios as Usuario[]),
      );
  }

  crearUsuario(input: {
    username: string;
    email: string;
    password: string;
    rol: string;
  }): Observable<Usuario> {
    return this.apollo
      .mutate<{ crearUsuario: Usuario }>({
        mutation: Q.CREAR_USUARIO,
        variables: { input },
        refetchQueries: [{ query: Q.GET_USUARIOS }],
      })
      .pipe(map((r) => r.data!.crearUsuario));
  }

  actualizarUsuario(
    id: string,
    input: { username: string; email: string; password?: string; rol: string },
  ): Observable<Usuario> {
    return this.apollo
      .mutate<{ actualizarUsuario: Usuario }>({
        mutation: Q.ACTUALIZAR_USUARIO,
        variables: { id, input },
        refetchQueries: [{ query: Q.GET_USUARIOS }],
      })
      .pipe(map((r) => r.data!.actualizarUsuario));
  }

  cambiarRolUsuario(id: string, rol: string): Observable<Usuario> {
    return this.apollo
      .mutate<{ cambiarRolUsuario: Usuario }>({
        mutation: Q.CAMBIAR_ROL_USUARIO,
        variables: { id, rol },
        refetchQueries: [{ query: Q.GET_USUARIOS }],
      })
      .pipe(map((r) => r.data!.cambiarRolUsuario));
  }

  toggleUsuario(id: string): Observable<Usuario> {
    return this.apollo
      .mutate<{ toggleUsuario: Usuario }>({
        mutation: Q.TOGGLE_USUARIO,
        variables: { id },
        refetchQueries: [{ query: Q.GET_USUARIOS }],
      })
      .pipe(map((r) => r.data!.toggleUsuario));
  }

  restablecerPassword(id: string, nuevaPassword: string): Observable<Usuario> {
    return this.apollo
      .mutate<{ restablecerPassword: Usuario }>({
        mutation: Q.RESTABLECER_PASSWORD,
        variables: { id, nuevaPassword },
      })
      .pipe(map((r) => r.data!.restablecerPassword));
  }

  // ── Áreas ─────────────────────────────────────────────────────────────────

  getCategorias(): Observable<CategoriaActivo[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_CATEGORIAS, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.categorias != null),
        map((r: any) => r.data.categorias as CategoriaActivo[]),
      );
  }

  getAreas(): Observable<Area[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_AREAS, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.areas != null),
        map((r: any) => r.data.areas as Area[]),
      );
  }

  crearArea(input: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    responsableId?: string;
  }): Observable<Area> {
    return this.apollo
      .mutate<{ crearArea: Area }>({
        mutation: Q.CREAR_AREA,
        variables: { input },
        refetchQueries: [{ query: Q.GET_AREAS }],
      })
      .pipe(map((r) => r.data!.crearArea));
  }

  actualizarArea(
    id: string,
    input: { codigo: string; nombre: string; descripcion?: string; responsableId?: string },
  ): Observable<Area> {
    return this.apollo
      .mutate<{ actualizarArea: Area }>({
        mutation: Q.ACTUALIZAR_AREA,
        variables: { id, input },
        refetchQueries: [{ query: Q.GET_AREAS }],
      })
      .pipe(map((r) => r.data!.actualizarArea));
  }

  eliminarArea(id: string): Observable<boolean> {
    return this.apollo
      .mutate<{ eliminarArea: boolean }>({
        mutation: Q.ELIMINAR_AREA,
        variables: { id },
        refetchQueries: [{ query: Q.GET_AREAS }],
      })
      .pipe(map((r) => r.data!.eliminarArea));
  }

  // ── Responsables ──────────────────────────────────────────────────────────

  getResponsables(): Observable<Responsable[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_RESPONSABLES, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.responsables != null),
        map((r: any) => r.data.responsables as Responsable[]),
      );
  }

  crearResponsable(input: {
    nombre: string;
    cargo: string;
    email: string;
    telefono?: string;
  }): Observable<Responsable> {
    return this.apollo
      .mutate<{ crearResponsable: Responsable }>({
        mutation: Q.CREAR_RESPONSABLE,
        variables: { input },
        refetchQueries: [{ query: Q.GET_RESPONSABLES }],
      })
      .pipe(map((r) => r.data!.crearResponsable));
  }

  actualizarResponsable(
    id: string,
    input: { nombre: string; cargo: string; email: string; telefono?: string },
  ): Observable<Responsable> {
    return this.apollo
      .mutate<{ actualizarResponsable: Responsable }>({
        mutation: Q.ACTUALIZAR_RESPONSABLE,
        variables: { id, input },
        refetchQueries: [{ query: Q.GET_RESPONSABLES }],
      })
      .pipe(map((r) => r.data!.actualizarResponsable));
  }

  // ── Categorías ────────────────────────────────────────────────────────────

  crearCategoria(input: {
    nombre: string;
    descripcion?: string;
    metodoDepreciacion: string;
    tasaDepreciacion: number;
  }): Observable<CategoriaActivo> {
    return this.apollo
      .mutate<{ crearCategoriaActivo: CategoriaActivo }>({
        mutation: Q.CREAR_CATEGORIA,
        variables: { input },
        refetchQueries: [{ query: Q.GET_CATEGORIAS }],
      })
      .pipe(map((r) => r.data!.crearCategoriaActivo));
  }

  actualizarCategoria(
    id: string,
    input: {
      nombre: string;
      descripcion?: string;
      metodoDepreciacion: string;
      tasaDepreciacion: number;
    },
  ): Observable<CategoriaActivo> {
    return this.apollo
      .mutate<{ actualizarCategoriaActivo: CategoriaActivo }>({
        mutation: Q.ACTUALIZAR_CATEGORIA,
        variables: { id, input },
        refetchQueries: [{ query: Q.GET_CATEGORIAS }],
      })
      .pipe(map((r) => r.data!.actualizarCategoriaActivo));
  }

  // ── Proyección de vida útil ──────────────────────────────────────────────

  proyectarVidaUtil(activoId: string): Observable<ProyeccionVidaUtilDTO> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_PROYECCION_VIDA_UTIL,
        variables: { activoId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.proyectarVidaUtil != null),
        map((r: any) => r.data.proyectarVidaUtil as ProyeccionVidaUtilDTO),
      );
  }

  // ── Búsqueda de usuarios ──────────────────────────────────────────────────

  buscarUsuarios(query: string): Observable<import('../models/models').Usuario[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.BUSCAR_USUARIOS,
        variables: { query },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.buscarUsuarios != null),
        map((r: any) => r.data.buscarUsuarios),
      );
  }

  // ── Verificar integridad blockchain ──────────────────────────────────────

  verificarIntegridadBlockchain(registroId: string): Observable<boolean> {
    return this.apollo
      .query<any>({
        query: Q.VERIFICAR_INTEGRIDAD_BLOCKCHAIN,
        variables: { registroId },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((r: any) => r.data?.verificarIntegridadBlockchain as boolean),
        catchError((err) => throwError(() => err)),
      );
  }
}
