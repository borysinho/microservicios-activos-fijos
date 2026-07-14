import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "../config/env";
import type { DiagnosticoIA } from "../types/activo.types";

const BASE_URL = env.MS2_BASE_URL;
const DIAGNOSTICO_URL = `${BASE_URL}/ia/diagnostico-imagen`;
const HEALTH_URL = BASE_URL.replace(/\/api\/?$/, "/health");

type HttpResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
};

function imageUriForUpload(imagePath: string): string {
  if (imagePath.startsWith("file://") || imagePath.startsWith("content://")) {
    return imagePath;
  }
  return `file://${imagePath}`;
}

function alternateImageUri(imagePath: string): string | null {
  if (imagePath.startsWith("file://")) {
    return imagePath.replace(/^file:\/\//, "");
  }
  if (imagePath.startsWith("content://")) {
    return null;
  }
  return imagePath;
}

function buildDiagnosticoFormData(params: {
  imagePath: string;
  activoId: string;
  latitud: number;
  longitud: number;
  imageUri: string;
}): FormData {
  const formData = new FormData();
  formData.append("imagen", {
    uri: params.imageUri,
    type: "image/jpeg",
    name: "diagnostico.jpg",
  } as any);
  formData.append("activoId", params.activoId);
  formData.append("latitud", String(params.latitud));
  formData.append("longitud", String(params.longitud));
  return formData;
}

async function assertMs2Reachable(): Promise<void> {
  const response = await fetch(HEALTH_URL);
  if (!response.ok) {
    throw new Error(`El servicio de verificación respondió ${response.status}.`);
  }
}

async function postDiagnostico(
  formData: FormData,
  token: string | null,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", DIAGNOSTICO_URL);
    xhr.timeout = 60000;

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.onload = () => {
      const responseText = xhr.responseText ?? "";
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: async () => responseText,
        json: async () => JSON.parse(responseText),
      });
    };
    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.ontimeout = () => reject(new Error("Tiempo de espera agotado"));
    xhr.send(formData);
  });
}

/** CU-35, CU-36: Enviar imagen para verificación visual IA */
async function diagnosticarImagen(params: {
  imagePath: string;
  activoId: string;
  latitud: number;
  longitud: number;
}): Promise<DiagnosticoIA> {
  const token = await AsyncStorage.getItem("auth_token");
  const primaryImageUri = imageUriForUpload(params.imagePath);
  const fallbackImageUri = alternateImageUri(params.imagePath);

  let response: HttpResponse;
  try {
    response = await postDiagnostico(
      buildDiagnosticoFormData({ ...params, imageUri: primaryImageUri }),
      token,
    );
  } catch (err: any) {
    try {
      await assertMs2Reachable();
      if (fallbackImageUri && fallbackImageUri !== primaryImageUri) {
        response = await postDiagnostico(
          buildDiagnosticoFormData({ ...params, imageUri: fallbackImageUri }),
          token,
        );
      } else {
        throw err;
      }
    } catch (retryErr: any) {
      const reason = retryErr?.message ?? err?.message ?? "";
      throw new Error(
        `No se pudo conectar con el servicio de verificación visual. Verifica la conexión del dispositivo. ${reason}`.trim(),
      );
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Error en verificación IA: ${response.status} — ${error}`,
    );
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

/** CU-38: Obtener historial de verificaciones de un activo */
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
