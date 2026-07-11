"""Wrapper del modelo K-Means para agrupacion de activos."""

from typing import Any


class KMeans_Clustering:
    """Adaptador del estimador K-Means cargado desde joblib."""

    def __init__(self, model: Any) -> None:
        self._model = model

    def predict(self, features):
        """Retorna el cluster asignado para los vectores recibidos."""
        return self._model.predict(features)
