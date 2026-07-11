"""Wrapper del modelo Deep Learning para verificacion visual de activos."""

from typing import Any


class CNN_EstadoActivo:
    """
    Adaptador del modelo Keras usado por MS2.

    El nombre se conserva por requisito academico, pero la salida del CNN se usa
    como senal auxiliar dentro de la verificacion visual, no como diagnostico
    absoluto del estado fisico.
    """

    clases = ["BUENO", "DETERIORADO", "REQUIERE_MANTENIMIENTO", "OXIDADO"]

    def __init__(self, model: Any) -> None:
        self._model = model

    def predict(self, *args, **kwargs):
        """Mantiene compatibilidad con servicios que esperan un modelo Keras."""
        return self._model.predict(*args, **kwargs)

    def predecir(self, imagen_array) -> dict:
        """Retorna la clase con mayor probabilidad para una imagen preprocesada."""
        import numpy as np

        predicciones = self.predict(imagen_array, verbose=0)[0]
        idx = int(np.argmax(predicciones))
        clase = self.clases[idx] if idx < len(self.clases) else f"CLASE_{idx}"
        confianza = float(predicciones[idx])
        return {"clase": clase, "confianza": round(confianza, 4)}
