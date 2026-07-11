"""Wrapper del modelo Random Forest para vida util y riesgo."""

from typing import Any


class RandomForest_VidaUtil:
    """Adaptador para bundle joblib `{regressor, classifier}` o estimador unico."""

    def __init__(self, model: Any) -> None:
        self._model = model

    @property
    def regressor(self):
        if isinstance(self._model, dict):
            return self._model["regressor"]
        return self._model

    @property
    def classifier(self):
        if isinstance(self._model, dict):
            return self._model["classifier"]
        return self._model

    def predict(self, features):
        """Predice meses restantes de vida util."""
        return self.regressor.predict(features)

    def predict_proba(self, features):
        """Predice probabilidad de fallo cuando el estimador la soporta."""
        return self.classifier.predict_proba(features)
