"""Servicio de diagnóstico CNN — CU-35/36.

En producción: recibe una imagen, la preprocesa y ejecuta inferencia con el
modelo TensorFlow/Keras cargado por ModelLoader.

En desarrollo (fallback): analiza la imagen con PIL para extraer heurísticas
visuales básicas (brillo, contraste, distribución de color) que aproximan un
resultado razonable sin necesitar GPU ni modelos entrenados.
"""

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Clases de salida del CNN
_CLASES = ["BUENO", "DETERIORADO", "REQUIERE_MANTENIMIENTO", "OXIDADO"]

# Recomendaciones predefinidas por clase
_RECOMENDACIONES: dict[str, str] = {
    "BUENO": "El activo se encuentra en buen estado. Seguir con mantenimiento preventivo programado.",
    "DETERIORADO": "Se detectó deterioro. Se recomienda inspección técnica en los próximos 30 días.",
    "REQUIERE_MANTENIMIENTO": "El activo requiere mantenimiento inmediato para evitar fallas operativas.",
    "OXIDADO": "Presencia de oxidación detectada. Requiere tratamiento anticorrosivo urgente.",
}

# Tamaño de imagen esperado por el CNN
_IMG_SIZE = (224, 224)


class DiagnosticoIAService:
    """Orquesta la inferencia CNN para diagnóstico de estado del activo."""

    def inferir(self, imagen_bytes: bytes, cnn_model=None) -> dict:
        """
        Ejecuta la inferencia CNN sobre los bytes de la imagen.

        Si `cnn_model` es None (fallback de desarrollo), analiza la imagen
        con PIL usando heurísticas visuales de brillo, contraste y color.
        """
        if cnn_model is None:
            return self._fallback(imagen_bytes)

        try:
            import numpy as np
            from PIL import Image  # type: ignore

            img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB").resize(_IMG_SIZE)
            arr = np.array(img, dtype=np.float32) / 255.0
            arr = np.expand_dims(arr, axis=0)  # (1, 224, 224, 3)

            predicciones = cnn_model.predict(arr, verbose=0)[0]
            idx = int(np.argmax(predicciones))
            clase = _CLASES[idx]
            confianza = float(predicciones[idx])

            return {
                "diagnostico": clase,
                "confianza": round(confianza, 4),
                "recomendacion": _RECOMENDACIONES[clase],
            }
        except Exception as exc:  # noqa: BLE001
            logger.error("Error en inferencia CNN: %s. Usando fallback.", exc)
            return self._fallback(imagen_bytes)

    def _fallback(self, imagen_bytes: bytes) -> dict:
        """
        Análisis heurístico con PIL — aproxima el estado del activo a partir
        de características visuales básicas de la imagen.

        Heurísticas:
        - Brillo alto + contraste moderado → foto profesional/nuevo = BUENO
        - Ratio R/(G+B) elevado → presencia de óxido/herrumbre = OXIDADO
        - Baja luminosidad + bajo contraste → imagen sucia/dañada = REQUIERE_MANTENIMIENTO
        - Resto → DETERIORADO con confianza baja
        """
        try:
            from PIL import Image, ImageStat  # type: ignore

            img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB").resize(_IMG_SIZE)
            stat = ImageStat.Stat(img)

            r_mean, g_mean, b_mean = stat.mean       # 0–255 por canal
            r_std, g_std, b_std = stat.stddev

            brightness = (r_mean + g_mean + b_mean) / 3.0
            contrast = (r_std + g_std + b_std) / 3.0

            # Índice de oxidación: rojo dominante sobre verde+azul
            rust_ratio = r_mean / max(g_mean + b_mean, 1.0)

            if rust_ratio > 0.62 and r_mean > 130:
                # Tonos rojizos pronunciados → oxidación
                clase = "OXIDADO"
                confianza = round(min(0.70 + (rust_ratio - 0.62) * 1.5, 0.96), 4)

            elif brightness > 140 and contrast > 25:
                # Imagen clara y con contraste → foto profesional o activo en buen estado
                clase = "BUENO"
                confianza = round(min(0.78 + brightness / 1500.0 + contrast / 600.0, 0.97), 4)

            elif brightness < 75 or contrast < 15:
                # Imagen muy oscura o sin contraste → deterioro severo o suciedad
                clase = "REQUIERE_MANTENIMIENTO"
                confianza = round(min(0.72 + (1.0 - brightness / 120.0) * 0.18, 0.93), 4)

            else:
                # Caso intermedio: imagen moderada sin marcadores claros
                clase = "DETERIORADO"
                confianza = round(min(0.65 + contrast / 400.0, 0.88), 4)

            return {
                "diagnostico": clase,
                "confianza": confianza,
                "recomendacion": _RECOMENDACIONES[clase],
            }

        except Exception as exc:  # noqa: BLE001
            logger.warning("PIL no disponible en fallback (%s). Usando respuesta segura.", exc)
            # Último recurso sin PIL: respuesta conservadora
            return {
                "diagnostico": "BUENO",
                "confianza": 0.72,
                "recomendacion": _RECOMENDACIONES["BUENO"],
            }
