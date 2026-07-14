import { gql } from '@apollo/client/core';

export const GET_ACTIVOS = gql`
  query GetActivos($filtro: FiltroActivoInput) {
    activos(filtro: $filtro) {
      id
      codigo
      nombre
      descripcion
      estado
      ubicacion
      valorAdquisicion
      vidaUtilAnios
      fechaAdquisicion
      categoria {
        id
        nombre
        metodoDepreciacion
        tasaDepreciacion
      }
      areaActual {
        id
        codigo
        nombre
      }
    }
  }
`;

export const GET_ACTIVO = gql`
  query GetActivo($id: ID!) {
    activo(id: $id) {
      id
      codigo
      nombre
      descripcion
      estado
      ubicacion
      valorAdquisicion
      vidaUtilAnios
      fechaAdquisicion
      valorLibros
      categoria {
        id
        nombre
        metodoDepreciacion
        tasaDepreciacion
      }
      areaActual {
        id
        codigo
        nombre
      }
      asignaciones {
        id
        activa
        fechaAsignacion
        observaciones
        responsable {
          id
          nombre
          cargo
          email
        }
        area {
          id
          codigo
          nombre
        }
      }
      traslados {
        id
        fecha
        motivoTraslado
        recepcionConfirmada
        areaOrigen {
          id
          nombre
        }
        areaDestino {
          id
          nombre
        }
        autorizadoPor {
          id
          username
        }
      }
      registrosBlockchain {
        id
        hash
        tipoTransaccion
        bloqueId
        timestamp
        payload
      }
    }
  }
`;

export const GET_DASHBOARD_BI = gql`
  query GetDashboardBI {
    dashboardBI {
      totalActivos
      activosActivos
      activosEnMantenimiento
      activosTransferidos
      activosDadoDeBaja
      valorTotalInventario
      depreciacionAcumuladaTotal
      asignacionesActivas
      trasladosPendientes
      activosPorCategoria {
        categoria
        cantidad
      }
      activosPorArea {
        area
        cantidad
      }
      adquisicionesPorAnio {
        anio
        cantidad
      }
    }
  }
`;

export const GET_HISTORIAL_BLOCKCHAIN = gql`
  query GetHistorialBlockchain($activoId: ID!) {
    historialBlockchain(activoId: $activoId) {
      id
      hash
      tipoTransaccion
      payload
      bloqueId
      timestamp
      activo {
        id
        codigo
        nombre
      }
    }
  }
`;

const INCIDENCIA_FIELDS = gql`
  fragment IncidenciaFields on Incidencia {
    id
    origen
    notificacionId
    codigoReferencia
    titulo
    tipo
    area
    prioridad
    estado
    detalle
    responsableOperativo
    diagnostico
    accionEjecutada
    proximaAccion
    fechaCompromiso
    fechaCreacion
    fechaActualizacion
    fechaCierre
    activo {
      id
      codigo
      nombre
      estado
      areaActual {
        id
        nombre
      }
    }
    creadoPor {
      id
      username
      email
    }
    cerradoPor {
      id
      username
      email
    }
  }
`;

export const GET_INCIDENCIAS = gql`
  ${INCIDENCIA_FIELDS}
  query GetIncidencias($filtro: FiltroIncidenciaInput) {
    incidencias(filtro: $filtro) {
      ...IncidenciaFields
    }
  }
`;

export const SINCRONIZAR_INCIDENCIA = gql`
  ${INCIDENCIA_FIELDS}
  mutation SincronizarIncidencia($input: IncidenciaInput!) {
    sincronizarIncidencia(input: $input) {
      ...IncidenciaFields
    }
  }
`;

export const ACTUALIZAR_INCIDENCIA = gql`
  ${INCIDENCIA_FIELDS}
  mutation ActualizarIncidencia($id: ID!, $input: IncidenciaGestionInput!) {
    actualizarIncidencia(id: $id, input: $input) {
      ...IncidenciaFields
    }
  }
`;

export const CERRAR_INCIDENCIA = gql`
  ${INCIDENCIA_FIELDS}
  mutation CerrarIncidencia($id: ID!, $input: IncidenciaGestionInput!) {
    cerrarIncidencia(id: $id, input: $input) {
      ...IncidenciaFields
    }
  }
`;

export const GET_REPORTE_DEPRECIACION = gql`
  query GetReporteDepreciacion($anio: Int!) {
    reporteDepreciacion(anio: $anio) {
      anio
      totalDepreciacionAnio
      totalValorLibros
      detalles {
        activoCodigo
        activoNombre
        metodoDepreciacion
        valorAdquisicion
        depreciacionAcumulada
        depreciacionAnio
        valorLibros
      }
    }
  }
`;

export const GET_USUARIOS = gql`
  query GetUsuarios {
    usuarios {
      id
      username
      email
      rol
      activo
    }
  }
`;

export const GET_CATEGORIAS = gql`
  query GetCategorias {
    categorias {
      id
      nombre
      descripcion
      metodoDepreciacion
      tasaDepreciacion
    }
  }
`;

export const GET_AREAS = gql`
  query GetAreas {
    areas {
      id
      codigo
      nombre
      descripcion
    }
  }
`;

export const GET_RESPONSABLES = gql`
  query GetResponsables {
    responsables {
      id
      nombre
      cargo
      email
      telefono
    }
  }
`;

export const REGISTRAR_ACTIVO = gql`
  mutation RegistrarActivo($input: ActivoInput!) {
    registrarActivo(input: $input) {
      id
      codigo
      nombre
      estado
      categoria {
        id
        nombre
      }
      areaActual {
        id
        nombre
      }
    }
  }
`;

export const ASIGNAR_ACTIVO = gql`
  mutation AsignarActivo($input: AsignacionInput!) {
    asignarActivo(input: $input) {
      id
      activa
      fechaAsignacion
      responsable {
        id
        nombre
      }
      area {
        id
        nombre
      }
    }
  }
`;

export const TRASLADAR_ACTIVO = gql`
  mutation TrasladarActivo($input: TrasladoInput!) {
    trasladarActivo(input: $input) {
      id
      fecha
      motivoTraslado
      areaOrigen {
        nombre
      }
      areaDestino {
        nombre
      }
    }
  }
`;

export const DAR_DE_BAJA = gql`
  mutation DarDeBajaActivo($input: BajaInput!) {
    darDeBajaActivo(input: $input) {
      id
      fecha
      motivo
      valorResidual
      autorizada
      activo {
        id
        codigo
        nombre
      }
    }
  }
`;

export const REGISTRAR_BAJA = gql`
  mutation RegistrarBajaActivo($input: BajaInput!) {
    registrarBajaActivo(input: $input) {
      id
      fecha
      motivo
      valorResidual
      numeroResolucion
      autorizada
      activo {
        id
        codigo
        nombre
      }
      autorizadoPor {
        id
        username
      }
    }
  }
`;

export const AUTORIZAR_BAJA = gql`
  mutation AutorizarBajaActivo($bajaId: ID!, $autorizadoPorId: ID!) {
    autorizarBajaActivo(bajaId: $bajaId, autorizadoPorId: $autorizadoPorId) {
      id
      autorizada
      fecha
      activo {
        id
        codigo
        nombre
        estado
      }
      autorizadoPor {
        id
        username
      }
    }
  }
`;

export const CREAR_USUARIO = gql`
  mutation CrearUsuario($input: UsuarioInput!) {
    crearUsuario(input: $input) {
      id
      username
      email
      rol
      activo
    }
  }
`;

export const TOGGLE_USUARIO = gql`
  mutation ToggleUsuario($id: ID!) {
    toggleUsuario(id: $id) {
      id
      username
      email
      rol
      activo
    }
  }
`;

export const CREAR_AREA = gql`
  mutation CrearArea($input: AreaInput!) {
    crearArea(input: $input) {
      id
      codigo
      nombre
      descripcion
    }
  }
`;

export const ACTUALIZAR_AREA = gql`
  mutation ActualizarArea($id: ID!, $input: AreaInput!) {
    actualizarArea(id: $id, input: $input) {
      id
      codigo
      nombre
      descripcion
    }
  }
`;

export const CREAR_RESPONSABLE = gql`
  mutation CrearResponsable($input: ResponsableInput!) {
    crearResponsable(input: $input) {
      id
      nombre
      cargo
      email
      telefono
    }
  }
`;

export const ACTUALIZAR_RESPONSABLE = gql`
  mutation ActualizarResponsable($id: ID!, $input: ResponsableInput!) {
    actualizarResponsable(id: $id, input: $input) {
      id
      nombre
      cargo
      email
      telefono
    }
  }
`;

export const CREAR_CATEGORIA = gql`
  mutation CrearCategoriaActivo($input: CategoriaActivoInput!) {
    crearCategoriaActivo(input: $input) {
      id
      nombre
      descripcion
      metodoDepreciacion
      tasaDepreciacion
    }
  }
`;

export const ACTUALIZAR_CATEGORIA = gql`
  mutation ActualizarCategoriaActivo($id: ID!, $input: CategoriaActivoInput!) {
    actualizarCategoriaActivo(id: $id, input: $input) {
      id
      nombre
      descripcion
      metodoDepreciacion
      tasaDepreciacion
    }
  }
`;

export const ACTUALIZAR_ACTIVO = gql`
  mutation ActualizarActivo($id: ID!, $input: ActivoInput!) {
    actualizarActivo(id: $id, input: $input) {
      id
      codigo
      nombre
      descripcion
      estado
      ubicacion
      valorAdquisicion
      vidaUtilAnios
      fechaAdquisicion
      categoria {
        id
        nombre
      }
      areaActual {
        id
        nombre
      }
    }
  }
`;

export const CAMBIAR_ESTADO_ACTIVO = gql`
  mutation CambiarEstadoActivo($activoId: ID!, $nuevoEstado: EstadoActivo!) {
    cambiarEstadoActivo(activoId: $activoId, nuevoEstado: $nuevoEstado) {
      id
      codigo
      nombre
      estado
    }
  }
`;

export const DEVOLVER_ACTIVO = gql`
  mutation DevolverActivo($asignacionId: ID!) {
    devolverActivo(asignacionId: $asignacionId) {
      id
      activa
      fechaDevolucion
      activo {
        id
        codigo
        nombre
      }
    }
  }
`;

export const CONFIRMAR_RECEPCION = gql`
  mutation ConfirmarRecepcionActivo($trasladoId: ID!) {
    confirmarRecepcionActivo(trasladoId: $trasladoId) {
      id
      recepcionConfirmada
      fecha
      areaDestino {
        id
        nombre
      }
    }
  }
`;

export const ACTUALIZAR_USUARIO = gql`
  mutation ActualizarUsuario($id: ID!, $input: UsuarioInput!) {
    actualizarUsuario(id: $id, input: $input) {
      id
      username
      email
      rol
      activo
    }
  }
`;

export const CAMBIAR_ROL_USUARIO = gql`
  mutation CambiarRolUsuario($id: ID!, $rol: RolUsuario!) {
    cambiarRolUsuario(id: $id, rol: $rol) {
      id
      username
      email
      rol
      activo
    }
  }
`;

export const RESTABLECER_PASSWORD = gql`
  mutation RestablecerPassword($id: ID!, $nuevaPassword: String!) {
    restablecerPassword(id: $id, nuevaPassword: $nuevaPassword) {
      id
      username
    }
  }
`;

export const ELIMINAR_AREA = gql`
  mutation EliminarArea($id: ID!) {
    eliminarArea(id: $id)
  }
`;

export const GET_ACTIVOS_POR_AREA = gql`
  query GetActivosPorArea($areaId: ID!) {
    activosPorArea(areaId: $areaId) {
      id
      codigo
      nombre
      estado
      categoria {
        id
        nombre
      }
    }
  }
`;

export const GET_ACTIVOS_POR_RESPONSABLE = gql`
  query GetActivosPorResponsable($responsableId: ID!) {
    activosPorResponsable(responsableId: $responsableId) {
      id
      codigo
      nombre
      estado
      categoria {
        id
        nombre
      }
    }
  }
`;

export const GET_ASIGNACIONES_POR_ACTIVO = gql`
  query GetAsignacionesPorActivo($activoId: ID!) {
    asignacionesPorActivo(activoId: $activoId) {
      id
      activa
      fechaAsignacion
      fechaDevolucion
      observaciones
      responsable {
        id
        nombre
        cargo
        email
      }
      area {
        id
        codigo
        nombre
      }
      activo {
        id
        codigo
        nombre
      }
    }
  }
`;

export const GET_ASIGNACIONES_POR_RESPONSABLE = gql`
  query GetAsignacionesPorResponsable($responsableId: ID!) {
    asignacionesPorResponsable(responsableId: $responsableId) {
      id
      activa
      fechaAsignacion
      fechaDevolucion
      observaciones
      responsable {
        id
        nombre
        cargo
        email
      }
      activo {
        id
        codigo
        nombre
        estado
      }
      area {
        id
        codigo
        nombre
      }
    }
  }
`;

export const GET_TRASLADOS_POR_ACTIVO = gql`
  query GetTrasladosPorActivo($activoId: ID!) {
    trasladosPorActivo(activoId: $activoId) {
      id
      fecha
      motivoTraslado
      recepcionConfirmada
      areaOrigen {
        id
        nombre
      }
      areaDestino {
        id
        nombre
      }
      autorizadoPor {
        id
        username
      }
      activo {
        id
        codigo
        nombre
      }
    }
  }
`;

export const GET_BAJA_POR_ACTIVO = gql`
  query GetBajaPorActivo($activoId: ID!) {
    bajaPorActivo(activoId: $activoId) {
      id
      fecha
      motivo
      valorResidual
      numeroResolucion
      autorizada
      activo {
        id
        codigo
        nombre
      }
      autorizadoPor {
        id
        username
      }
    }
  }
`;

export const GET_BAJAS = gql`
  query GetBajas {
    bajas {
      id
      fecha
      motivo
      valorResidual
      numeroResolucion
      autorizada
      activo {
        id
        codigo
        nombre
      }
      autorizadoPor {
        id
        username
      }
    }
  }
`;

export const GET_PROYECCION_VIDA_UTIL = gql`
  query GetProyeccionVidaUtil($activoId: ID!) {
    proyectarVidaUtil(activoId: $activoId) {
      activoId
      activoCodigo
      activoNombre
      vidaUtilAnios
      aniosTranscurridos
      aniosRestantes
      mesesRestantes
      porcentajeDepreciado
      valorLibros
      estaDepreciadoCompletamente
    }
  }
`;

export const BUSCAR_USUARIOS = gql`
  query BuscarUsuarios($query: String!) {
    buscarUsuarios(query: $query) {
      id
      username
      email
      rol
      activo
    }
  }
`;

export const VERIFICAR_INTEGRIDAD_BLOCKCHAIN = gql`
  query VerificarIntegridadBlockchain($registroId: ID!) {
    verificarIntegridadBlockchain(registroId: $registroId)
  }
`;
