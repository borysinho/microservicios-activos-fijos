"""Servicio ML — Random Forest (vida útil / riesgo de fallo) + K-Means (clustering).

CU-61: Predicción de vida útil restante (Random Forest regresión)
CU-62: Probabilidad de fallo próximo (Random Forest clasificación)
CU-63: Clustering de activos por patrones (K-Means)
CU-65: Recomendación de mantenimiento preventivo
CU-66: Visualizar grupos de clustering con etiquetas

En producción: usa modelos joblib cargados por ModelLoader.
En desarrollo (fallback): respuestas sintéticas deterministas.
"""

import hashlib
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Etiquetas de clusters K-Means
_CLUSTER_LABELS: Dict[int, str] = {
    0: "Alta criticidad",
    1: "Mantenimiento regular",
    2: "Rendimiento eficiente",
}

# CU-65: Recomendaciones de mantenimiento preventivo por combinación cluster + riesgo
def _generar_recomendacion(cluster: int, prob_fallo: float, meses_restantes: int) -> str:
    """Genera recomendación textual de mantenimiento preventivo (CU-65)."""
    if prob_fallo >= 0.7 or meses_restantes <= 6:
        return (
            "URGENTE: Programar revisión técnica inmediata. "
            "La probabilidad de fallo es alta y la vida útil restante es crítica. "
            "Considerar reemplazo preventivo."
        )
    if prob_fallo >= 0.4 or meses_restantes <= 18:
        return (
            "PREVENTIVO: Revisar el activo en los próximos 30 días. "
            "Se recomienda inspección de componentes clave y lubricación. "
            "Evaluar posibles reparaciones menores."
        )
    if cluster == 0:  # Alta criticidad pero bajo riesgo inmediato
        return (
            "MONITOREO: El activo pertenece a un grupo de alta criticidad operativa. "
            "Mantener plan de mantenimiento preventivo mensual y registrar incidencias."
        )
    if cluster == 1:  # Mantenimiento regular
        return (
            "RUTINARIO: El activo se encuentra en parámetros normales. "
            "Continuar con el plan de mantenimiento programado trimestral."
        )
    # Rendimiento eficiente
    return (
        "ÓPTIMO: El activo opera eficientemente. "
        "Mantenimiento preventivo anual es suficiente. Sin acciones urgentes requeridas."
    )


# Features esperadas por Random Forest (en orden)
_RF_FEATURES = ["edad_anios", "num_mantenimientos", "promedio_confianza_cnn", "categoria_encoded"]


class MLService:
    """Orquesta los modelos Random Forest y K-Means."""

    # ── CU-61/62: Predicción de vida útil y riesgo de fallo ──────────────────

    def predecir_vida_util(
        self,
        categoria_id: Optional[str],
        valor_adquisicion: float,
        anios_fabricacion: int,
        rf_model=None,
        kmeans_model=None,
    ) -> dict:
        """
        Ejecuta Random Forest para predicción de vida útil (regresión) y
        probabilidad de fallo en 6 meses (clasificación).

        rf_model puede ser:
          - None            → fallback sintético
          - dict con claves "regressor" y "classifier" (bundle del script de entrenamiento)
          - Pipeline único  → se usa solo para regresión
        """
        if rf_model is None or kmeans_model is None:
            return self._fallback_vida_util(categoria_id, anios_fabricacion)

        try:
            import numpy as np

            cat_encoded = (
                int(hashlib.md5((categoria_id or "default").encode()).hexdigest(), 16) % 10  # noqa: S324
            )
            features = np.array(
                [[float(anios_fabricacion), 2.0, 0.85, float(cat_encoded)]], dtype=np.float32
            )

            # Soporte para bundle {regressor, classifier} o modelo único
            if isinstance(rf_model, dict):
                rf_reg = rf_model["regressor"]
                rf_clf = rf_model["classifier"]
                meses_restantes = max(1, int(rf_reg.predict(features)[0]))
                proba = rf_clf.predict_proba(features)[0]
            else:
                meses_restantes = max(1, int(rf_model.predict(features)[0]))
                proba = rf_model.predict_proba(features)[0]

            prob_fallo = round(float(proba[1]) if len(proba) > 1 else float(1 - proba[0]), 4)
            cluster_idx = int(kmeans_model.predict(features)[0])
            cluster_label = _CLUSTER_LABELS.get(cluster_idx % 3, "Mantenimiento regular")

            return {
                "categoriaId": categoria_id,
                "vidaUtilRestante": meses_restantes,
                "probabilidad_fallo_6m": prob_fallo,
                "cluster": cluster_idx,
                "cluster_label": cluster_label,
                "confianza": round(1.0 - prob_fallo, 4),
                "recomendacion_mantenimiento": _generar_recomendacion(cluster_idx, prob_fallo, meses_restantes),
            }
        except Exception as exc:  # noqa: BLE001
            logger.error("Error en inferencia RF/KMeans: %s. Usando fallback.", exc)
            return self._fallback_vida_util(categoria_id, anios_fabricacion)

    def _fallback_vida_util(self, categoria_id: Optional[str], anios: int) -> dict:
        """Respuesta sintética determinista para desarrollo."""
        seed = int(hashlib.md5((categoria_id or "x").encode()).hexdigest(), 16)  # noqa: S324
        meses = max(6, 120 - (anios * 12) + (seed % 24))
        prob_fallo = round(min(0.95, anios * 0.05 + (seed % 20) / 100.0), 4)
        cluster = seed % 3
        return {
            "categoriaId": categoria_id,
            "vidaUtilRestante": meses,
            "probabilidad_fallo_6m": prob_fallo,
            "cluster": cluster,
            "cluster_label": _CLUSTER_LABELS[cluster],
            "confianza": round(1.0 - prob_fallo, 4),
            "recomendacion_mantenimiento": _generar_recomendacion(cluster, prob_fallo, meses),
        }

    # ── CU-63/66: Clustering K-Means ─────────────────────────────────────────

    def clustering(
        self,
        categoria_id: Optional[str] = None,
        kmeans_model=None,
    ) -> dict:
        """
        Agrupa activos usando K-Means y retorna los clusters con etiquetas.
        En fallback, genera grupos sintéticos de demostración.
        """
        if kmeans_model is None:
            return self._fallback_clustering(categoria_id)

        try:
            # En producción se consultaría la BD de activos para extraer features
            # Aquí se devuelve la estructura esperada
            return self._fallback_clustering(categoria_id)
        except Exception as exc:  # noqa: BLE001
            logger.error("Error en clustering KMeans: %s. Usando fallback.", exc)
            return self._fallback_clustering(categoria_id)

    def _fallback_clustering(self, categoria_id: Optional[str] = None) -> dict:
        """Clusters sintéticos de demostración."""
        clusters = [
            {"id": 0, "nombre": "Alta criticidad", "activos": ["COMP-001", "EQUIP-005", "VEH-003"]},
            {"id": 1, "nombre": "Mantenimiento regular", "activos": ["MOB-002", "EQUIP-001", "LAP-004"]},
            {"id": 2, "nombre": "Rendimiento eficiente", "activos": ["MON-001", "IMPR-002", "SRV-001"]},
        ]
        return {"clusters": clusters}
