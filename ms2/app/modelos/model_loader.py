"""Carga de modelos IA/ML al inicio de la aplicación.

En producción los modelos se descargan desde S3.
En desarrollo (sin credenciales AWS reales) se usa un fallback sintético
que simula respuestas para poder probar los endpoints sin GPU ni S3.
"""

import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ModelLoader:
    """Mantiene referencias a los modelos cargados. Se instancia una vez en lifespan."""

    cnn_model: Optional[Any] = None
    rf_model: Optional[Any] = None
    kmeans_model: Optional[Any] = None

    # Indica si se están usando modelos reales o fallbacks de desarrollo
    using_real_models: bool = False

    def load_all(self) -> None:
        """Intenta cargar los modelos desde S3; si falla, activa el fallback de desarrollo."""
        try:
            self._load_real_models()
            self.using_real_models = True
            logger.info("Modelos IA/ML cargados correctamente desde S3.")
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "No se pudieron cargar los modelos reales (%s). "
                "Usando fallback de desarrollo (respuestas sintéticas).",
                exc,
            )
            self.using_real_models = False

    def _load_real_models(self) -> None:
        """Carga los modelos reales.

        Si LOCAL_MODELS_PATH está definido (desarrollo), los carga desde el
        filesystem local. En caso contrario los descarga desde S3 (producción).
        """
        import joblib
        import tensorflow as tf  # type: ignore

        from app.config import settings

        local_path = settings.local_models_path

        if local_path:
            import os

            logger.info("LOCAL_MODELS_PATH='%s': cargando modelos desde filesystem local.", local_path)
            cnn_path = os.path.join(local_path, "cnn_estado_activo.keras")
            rf_path  = os.path.join(local_path, "rf_vida_util.joblib")
            km_path  = os.path.join(local_path, "kmeans_clustering.joblib")
        else:
            from app.infrastructure.s3_adapter import S3Adapter

            s3 = S3Adapter()
            cnn_path = s3.download_to_tmp("models/cnn_estado_activo.keras")
            rf_path  = s3.download_to_tmp("models/rf_vida_util.joblib")
            km_path  = s3.download_to_tmp("models/kmeans_clustering.joblib")

        # CNN — formato nativo Keras 3 (.keras)
        self.cnn_model = tf.keras.models.load_model(cnn_path)

        # Random Forest (joblib)
        self.rf_model = joblib.load(rf_path)

        # K-Means (joblib)
        self.kmeans_model = joblib.load(km_path)


# Instancia global — se usa desde los servicios IA/ML
model_loader = ModelLoader()
