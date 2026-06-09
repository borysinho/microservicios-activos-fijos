import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "../config/env";
import type { DiagnosticoIA } from "../types/activo.types";

const BASE_URL = env.MS2_BASE_URL;

/** CU-35, CU-36: Enviar imagen al MS2 para diagnóstico CNN */
async function diagnosticarImagen(params: {
  imagePath: string;
  activoId: string;
  latitud: number;
  longitud: number;
}): Promise<DiagnosticoIA> {
  const token = await AsyncStorage.getItem("auth_token");

  const formData = new FormData();
  formData.append("imagen", {
    uri: `file://${params.imagePath}`,
    type: "image/jpeg",
    name: "diagnostico.jpg",
  } as any);
  formData.append("activoId", params.activoId);
  formData.append("latitud", String(params.latitud));
  formData.append("longitud", String(params.longitud));

  const response = await fetch(`${BASE_URL}/ia/diagnostico-imagen`, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error en diagnóstico IA: ${response.status} — ${error}`);
  }

  const resultado = await response.json();
  return {
    ...resultado,
    activoId: params.activoId,
    latitud: params.latitud,
    longitud: params.longitud,
    fechaDiagnostico: new Date().toISOString(),
  };
}

/** CU-38: Obtener historial de diagnósticos de un activo desde MS2 */
async function getHistorialDiagnosticos(
  activoId: string,
): Promise<DiagnosticoIA[]> {
  const token = await AsyncStorage.getItem("auth_token");
  const response = await fetch(
    `${BASE_URL}/ia/diagnosticos?activoId=${activoId}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!response.ok) {
    throw new Error(`Error al obtener historial: ${response.status}`);
  }
  return response.json();
}

export const ms2Service = { diagnosticarImagen, getHistorialDiagnosticos };
