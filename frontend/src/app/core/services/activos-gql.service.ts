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

  getDashboardBI(): Observable<DashboardMetricasDTO> {
    return this.apollo.query<any>({ query: Q.GET_DASHBOARD_BI, fetchPolicy: 'network-only' }).pipe(
      map((r: any) => r.data?.dashboardBI as DashboardMetricasDTO),
      filter((d): d is DashboardMetricasDTO => d != null),
      catchError((err) => throwError(() => err)),
    );
  }

  getHistorialBlockchain(activoId: string): Observable<RegistroBlockchain[]> {
    return this.apollo
      .watchQuery<any>({
        query: Q.GET_HISTORIAL_BLOCKCHAIN,
        variables: { activoId },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.historialBlockchain != null),
        map((r: any) => r.data.historialBlockchain as RegistroBlockchain[]),
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

  getUsuarios(): Observable<Usuario[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_USUARIOS, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.usuarios != null),
        map((r: any) => r.data.usuarios as Usuario[]),
      );
  }

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

  getResponsables(): Observable<Responsable[]> {
    return this.apollo
      .watchQuery<any>({ query: Q.GET_RESPONSABLES, fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        filter((r: any) => r?.data?.responsables != null),
        map((r: any) => r.data.responsables as Responsable[]),
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

  asignarActivo(input: {
    activoId: string;
    responsableId: string;
    areaId: string;
    fechaAsignacion: string;
    observaciones?: string;
  }): Observable<Asignacion> {
    return this.apollo
      .mutate<{ asignarActivo: Asignacion }>({ mutation: Q.ASIGNAR_ACTIVO, variables: { input } })
      .pipe(map((r) => r.data!.asignarActivo));
  }

  trasladarActivo(input: {
    activoId: string;
    areaDestinoId: string;
    autorizadoPorId: string;
    fecha: string;
    motivoTraslado: string;
  }): Observable<Traslado> {
    return this.apollo
      .mutate<{ trasladarActivo: Traslado }>({ mutation: Q.TRASLADAR_ACTIVO, variables: { input } })
      .pipe(map((r) => r.data!.trasladarActivo));
  }

  darDeBaja(input: {
    activoId: string;
    autorizadoPorId: string;
    motivo: string;
    valorResidual?: number;
    numeroResolucion?: string;
  }): Observable<Baja> {
    return this.apollo
      .mutate<{ darDeBajaActivo: Baja }>({ mutation: Q.DAR_DE_BAJA, variables: { input } })
      .pipe(map((r) => r.data!.darDeBajaActivo));
  }

  // ── Administración: Usuarios ────────────────────────────────────────────

  crearUsuario(input: {
    username: string;
    email: string;
    password: string;
    rol: string;
  }): Observable<Usuario> {
    return this.apollo
      .mutate<{
        crearUsuario: Usuario;
      }>({ mutation: Q.CREAR_USUARIO, variables: { input }, refetchQueries: [{ query: Q.GET_USUARIOS }] })
      .pipe(map((r) => r.data!.crearUsuario));
  }

  toggleUsuario(id: string): Observable<Usuario> {
    return this.apollo
      .mutate<{
        toggleUsuario: Usuario;
      }>({ mutation: Q.TOGGLE_USUARIO, variables: { id }, refetchQueries: [{ query: Q.GET_USUARIOS }] })
      .pipe(map((r) => r.data!.toggleUsuario));
  }

  // ── Administración: Áreas ───────────────────────────────────────────────

  crearArea(input: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    responsableId?: string;
  }): Observable<Area> {
    return this.apollo
      .mutate<{
        crearArea: Area;
      }>({ mutation: Q.CREAR_AREA, variables: { input }, refetchQueries: [{ query: Q.GET_AREAS }] })
      .pipe(map((r) => r.data!.crearArea));
  }

  actualizarArea(
    id: string,
    input: { codigo: string; nombre: string; descripcion?: string; responsableId?: string },
  ): Observable<Area> {
    return this.apollo
      .mutate<{
        actualizarArea: Area;
      }>({ mutation: Q.ACTUALIZAR_AREA, variables: { id, input }, refetchQueries: [{ query: Q.GET_AREAS }] })
      .pipe(map((r) => r.data!.actualizarArea));
  }

  // ── Administración: Responsables ────────────────────────────────────────

  crearResponsable(input: {
    nombre: string;
    cargo: string;
    email: string;
    telefono?: string;
  }): Observable<Responsable> {
    return this.apollo
      .mutate<{
        crearResponsable: Responsable;
      }>({ mutation: Q.CREAR_RESPONSABLE, variables: { input }, refetchQueries: [{ query: Q.GET_RESPONSABLES }] })
      .pipe(map((r) => r.data!.crearResponsable));
  }

  actualizarResponsable(
    id: string,
    input: { nombre: string; cargo: string; email: string; telefono?: string },
  ): Observable<Responsable> {
    return this.apollo
      .mutate<{
        actualizarResponsable: Responsable;
      }>({ mutation: Q.ACTUALIZAR_RESPONSABLE, variables: { id, input }, refetchQueries: [{ query: Q.GET_RESPONSABLES }] })
      .pipe(map((r) => r.data!.actualizarResponsable));
  }

  // ── Administración: Categorías ──────────────────────────────────────────

  crearCategoria(input: {
    nombre: string;
    descripcion?: string;
    metodoDepreciacion: string;
    tasaDepreciacion: number;
  }): Observable<CategoriaActivo> {
    return this.apollo
      .mutate<{
        crearCategoriaActivo: CategoriaActivo;
      }>({ mutation: Q.CREAR_CATEGORIA, variables: { input }, refetchQueries: [{ query: Q.GET_CATEGORIAS }] })
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
      .mutate<{
        actualizarCategoriaActivo: CategoriaActivo;
      }>({ mutation: Q.ACTUALIZAR_CATEGORIA, variables: { id, input }, refetchQueries: [{ query: Q.GET_CATEGORIAS }] })
      .pipe(map((r) => r.data!.actualizarCategoriaActivo));
  }
}
