"""Servicio de verificacion visual IA — CU-35/36.

El objetivo no es dictaminar el estado fisico exacto del activo a partir de una
foto aislada. La imagen se usa como evidencia auditable: se valida calidad de
captura, presencia visual de un objeto y, cuando existe imagen historica, se
compara similitud para detectar posibles inconsistencias.

Si existe un modelo CNN cargado, su salida se conserva como senal auxiliar. La
decision final sigue siendo conservadora porque los modelos entrenados con
datasets externos no garantizan precision sobre activos reales de la entidad.
"""

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Clases de salida historicas del CNN. Se mantienen solo como senal auxiliar.
_CLASES = ["BUENO", "DETERIORADO", "REQUIERE_MANTENIMIENTO", "OXIDADO"]

_RECOMENDACIONES: dict[str, str] = {
    "EVIDENCIA_VALIDADA": (
        "La fotografia es util como evidencia documental. Registrar la revision y continuar "
        "con el flujo normal del activo."
    ),
    "REQUIERE_REVISION": (
        "La evidencia no permite validar automaticamente el activo. Un responsable debe revisar "
        "la fotografia y confirmar el registro."
    ),
    "FOTO_NO_CONFIABLE": (
        "La fotografia no tiene calidad suficiente para auditoria. Tome una nueva imagen con buena "
        "iluminacion, enfoque y el activo completo dentro del encuadre."
    ),
    "POSIBLE_INCONSISTENCIA": (
        "La imagen actual difiere de la evidencia historica. Verificar presencialmente el activo, "
        "su etiqueta patrimonial y su ubicacion."
    ),
}

_IMG_SIZE = (224, 224)


class DiagnosticoIAService:
    """Orquesta la verificacion visual asistida por IA."""

    def inferir(
        self,
        imagen_bytes: bytes,
        cnn_model=None,
        referencia_bytes: Optional[bytes] = None,
        codigo_esperado: Optional[str] = None,
    ) -> dict:
        """
        Analiza la imagen como evidencia visual.

        `referencia_bytes` permite comparar contra una foto historica del mismo
        activo. `codigo_esperado` queda registrado como criterio pendiente de OCR
        cuando no existe un motor OCR configurado.
        """
        resultado = self._verificar_evidencia(imagen_bytes, referencia_bytes, codigo_esperado)

        senal_cnn = self._senal_cnn(imagen_bytes, cnn_model)
        if senal_cnn is not None:
            resultado["senalModelo"] = senal_cnn
            resultado["verificaciones"].append(
                {
                    "criterio": "clasificador_visual_auxiliar",
                    "resultado": "INFORMATIVO",
                    "detalle": (
                        f"Modelo CNN externo sugirio {senal_cnn['clase']} "
                        f"con {round(senal_cnn['confianza'] * 100, 1)}% de confianza."
                    ),
                }
            )

        return resultado

    def _senal_cnn(self, imagen_bytes: bytes, cnn_model=None) -> Optional[dict]:
        """Ejecuta la CNN como senal auxiliar, sin decidir el diagnostico final."""
        if cnn_model is None:
            return None

        try:
            import numpy as np
            from PIL import Image  # type: ignore

            img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB").resize(_IMG_SIZE)
            arr = np.array(img, dtype=np.float32) / 255.0
            arr = np.expand_dims(arr, axis=0)  # (1, 224, 224, 3)

            predicciones = cnn_model.predict(arr, verbose=0)[0]
            idx = int(np.argmax(predicciones))
            clase = _CLASES[idx] if idx < len(_CLASES) else f"CLASE_{idx}"
            confianza = float(predicciones[idx])

            return {
                "clase": clase,
                "confianza": round(confianza, 4),
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo ejecutar la senal CNN auxiliar: %s", exc)
            return None

    def _verificar_evidencia(
        self,
        imagen_bytes: bytes,
        referencia_bytes: Optional[bytes],
        codigo_esperado: Optional[str],
    ) -> dict:
        """Verifica calidad, presencia visual y similitud historica."""
        try:
            from PIL import Image, ImageStat  # type: ignore

            original = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
            img = original.resize(_IMG_SIZE)
            metricas = self._metricas_imagen(img, original.size)

            calidad = self._score_calidad(metricas)
            presencia = self._score_presencia(metricas)
            similitud = None
            if referencia_bytes:
                similitud = self._similitud_hash(imagen_bytes, referencia_bytes)

            verificaciones = [
                {
                    "criterio": "calidad_fotografica",
                    "resultado": "OK" if calidad >= 0.55 else "OBSERVADO",
                    "detalle": self._detalle_calidad(metricas, calidad),
                },
                {
                    "criterio": "presencia_visual_activo",
                    "resultado": "OK" if presencia >= 0.50 else "OBSERVADO",
                    "detalle": (
                        "La imagen contiene suficientes bordes y contraste para usarse como evidencia."
                        if presencia >= 0.50
                        else "La imagen parece muy uniforme o no muestra claramente un objeto verificable."
                    ),
                },
            ]

            if codigo_esperado:
                verificaciones.append(
                    {
                        "criterio": "codigo_patrimonial",
                        "resultado": "PENDIENTE_OCR",
                        "detalle": (
                            f"Codigo esperado registrado: {codigo_esperado}. "
                            "La lectura OCR queda pendiente de un motor OCR configurado."
                        ),
                    }
                )

            if similitud is not None:
                verificaciones.append(
                    {
                        "criterio": "comparacion_historica",
                        "resultado": "OK" if similitud >= 0.72 else "OBSERVADO",
                        "detalle": (
                            f"Similitud visual con evidencia historica: {round(similitud * 100, 1)}%."
                        ),
                    }
                )

            diagnostico, confianza = self._resolver_resultado(calidad, presencia, similitud)

            return {
                "diagnostico": diagnostico,
                "estado": diagnostico.lower(),
                "confianza": confianza,
                "detalle": self._detalle_resultado(diagnostico, calidad, presencia, similitud),
                "recomendacion": _RECOMENDACIONES[diagnostico],
                "tipoAnalisis": "VERIFICACION_VISUAL_EVIDENCIA",
                "metricas": metricas,
                "verificaciones": verificaciones,
                "similitudReferencia": similitud,
            }

        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo verificar evidencia visual (%s). Usando respuesta conservadora.", exc)
            return {
                "diagnostico": "REQUIERE_REVISION",
                "estado": "requiere_revision",
                "confianza": 0.5,
                "detalle": "No fue posible analizar la imagen automaticamente; requiere revision humana.",
                "recomendacion": _RECOMENDACIONES["REQUIERE_REVISION"],
                "tipoAnalisis": "VERIFICACION_VISUAL_EVIDENCIA",
                "metricas": {},
                "verificaciones": [
                    {
                        "criterio": "analisis_automatico",
                        "resultado": "ERROR",
                        "detalle": "El analisis automatico no estuvo disponible.",
                    }
                ],
                "similitudReferencia": None,
            }

    def _metricas_imagen(self, img, size: tuple[int, int]) -> dict:
        from PIL import ImageFilter, ImageStat  # type: ignore

        stat = ImageStat.Stat(img)
        r_mean, g_mean, b_mean = stat.mean
        r_std, g_std, b_std = stat.stddev

        gray = img.convert("L")
        gray_stat = ImageStat.Stat(gray)
        edges = gray.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)

        width, height = size
        brightness = (r_mean + g_mean + b_mean) / 3.0
        contrast = gray_stat.stddev[0]
        edge_density = edge_stat.mean[0] / 255.0
        sharpness = min(edge_stat.stddev[0] / 64.0, 1.0)
        colorfulness = (abs(r_mean - g_mean) + abs(g_mean - b_mean) + abs(b_mean - r_mean)) / 510.0

        return {
            "ancho": width,
            "alto": height,
            "brillo": round(brightness, 2),
            "contraste": round(contrast, 2),
            "densidadBordes": round(edge_density, 4),
            "nitidez": round(sharpness, 4),
            "variedadColor": round(colorfulness, 4),
        }

    def _score_calidad(self, metricas: dict) -> float:
        resolucion = min((metricas["ancho"] * metricas["alto"]) / (640 * 480), 1.0)
        brillo = 1.0 - min(abs(metricas["brillo"] - 128.0) / 128.0, 1.0)
        contraste = min(metricas["contraste"] / 55.0, 1.0)
        nitidez = metricas["nitidez"]
        return round((resolucion * 0.25) + (brillo * 0.25) + (contraste * 0.25) + (nitidez * 0.25), 4)

    def _score_presencia(self, metricas: dict) -> float:
        contraste = min(metricas["contraste"] / 60.0, 1.0)
        bordes = min(metricas["densidadBordes"] / 0.12, 1.0)
        color = min(metricas["variedadColor"] / 0.18, 1.0)
        return round((contraste * 0.45) + (bordes * 0.40) + (color * 0.15), 4)

    def _similitud_hash(self, imagen_bytes: bytes, referencia_bytes: bytes) -> float:
        hash_actual = self._average_hash(imagen_bytes)
        hash_referencia = self._average_hash(referencia_bytes)
        distancia = sum(1 for a, b in zip(hash_actual, hash_referencia) if a != b)
        return round(1.0 - (distancia / len(hash_actual)), 4)

    def _average_hash(self, imagen_bytes: bytes) -> list[int]:
        from PIL import Image  # type: ignore

        img = Image.open(io.BytesIO(imagen_bytes)).convert("L").resize((8, 8))
        pixels = list(img.getdata())
        promedio = sum(pixels) / len(pixels)
        return [1 if px >= promedio else 0 for px in pixels]

    def _resolver_resultado(
        self,
        calidad: float,
        presencia: float,
        similitud: Optional[float],
    ) -> tuple[str, float]:
        if calidad < 0.45:
            return "FOTO_NO_CONFIABLE", round(max(0.50, 1.0 - calidad), 4)
        if presencia < 0.45:
            return "REQUIERE_REVISION", round(max(0.50, 1.0 - presencia), 4)
        if similitud is not None and similitud < 0.72:
            return "POSIBLE_INCONSISTENCIA", round(max(0.55, 1.0 - similitud), 4)
        if calidad >= 0.62 and presencia >= 0.55:
            base = (calidad + presencia + (similitud if similitud is not None else 0.78)) / 3.0
            return "EVIDENCIA_VALIDADA", round(min(base, 0.95), 4)
        return "REQUIERE_REVISION", round((calidad + presencia) / 2.0, 4)

    def _detalle_calidad(self, metricas: dict, calidad: float) -> str:
        return (
            f"Calidad {round(calidad * 100, 1)}%; brillo={metricas['brillo']}, "
            f"contraste={metricas['contraste']}, nitidez={metricas['nitidez']}."
        )

    def _detalle_resultado(
        self,
        diagnostico: str,
        calidad: float,
        presencia: float,
        similitud: Optional[float],
    ) -> str:
        partes = [
            f"Resultado de verificacion visual: {diagnostico.replace('_', ' ').lower()}.",
            f"Calidad de foto {round(calidad * 100, 1)}%.",
            f"Evidencia visual {round(presencia * 100, 1)}%.",
        ]
        if similitud is not None:
            partes.append(f"Similitud historica {round(similitud * 100, 1)}%.")
        return " ".join(partes)
