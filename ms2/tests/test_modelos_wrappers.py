"""Tests de wrappers de modelos IA/ML."""

import numpy as np

from app.modelos.cnn_estado_activo import CNN_EstadoActivo
from app.modelos.kmeans_clustering import KMeans_Clustering
from app.modelos.random_forest_vida_util import RandomForest_VidaUtil


class _FakeCNN:
    def predict(self, *_args, **_kwargs):
        return np.array([[0.05, 0.10, 0.80, 0.05]])


class _FakeRegressor:
    def predict(self, _features):
        return np.array([18])


class _FakeClassifier:
    def predict_proba(self, _features):
        return np.array([[0.7, 0.3]])


class _FakeKMeans:
    def predict(self, _features):
        return np.array([2])


def test_cnn_estado_activo_expone_senal_auxiliar():
    modelo = CNN_EstadoActivo(_FakeCNN())

    resultado = modelo.predecir(np.zeros((1, 224, 224, 3)))

    assert resultado == {"clase": "REQUIERE_MANTENIMIENTO", "confianza": 0.8}


def test_random_forest_vida_util_soporta_bundle_regresor_clasificador():
    modelo = RandomForest_VidaUtil({"regressor": _FakeRegressor(), "classifier": _FakeClassifier()})
    features = np.array([[1.0, 2.0, 0.8, 3.0]])

    assert int(modelo.predict(features)[0]) == 18
    assert float(modelo.predict_proba(features)[0][1]) == 0.3


def test_kmeans_clustering_predice_cluster():
    modelo = KMeans_Clustering(_FakeKMeans())

    assert int(modelo.predict(np.array([[1.0, 2.0, 0.8, 3.0]]))[0]) == 2
