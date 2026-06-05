"""
Entrenamiento y carga de modelos IA/ML a S3/LocalStack.

Ejecutar dentro del contenedor Python 3.11 (ver instrucciones al final).

Modelos generados:
  - CNN TensorFlow/Keras  → clasifica estado: BUENO / DETERIORADO /
                            REQUIERE_MANTENIMIENTO / OXIDADO
  - Random Forest         → regresión (meses_restantes) + clasificación
                            (probabilidad_fallo_6m)
  - K-Means               → 3 clusters por patrones de mantenimiento

Estrategia CNN (2 fases):
  Fase 1 — Entrenamiento base con Synthetic Industrial Metal Surface Defects
           (Kaggle: tatheerabbas/synthetic-industrial-metal-surface-defects)
           15 000 imágenes, 5 clases → mapeadas a 4 clases del dominio:
             normal           → BUENO
             scratch          → REQUIERE_MANTENIMIENTO
             crack + hole     → DETERIORADO
             rust             → OXIDADO
  Fase 2 — Fine-tuning con Rust-Iron Dataset
           (Kaggle: benpepperpots/rust-iron-dataset)
           ~1 455 fotos reales de corrosión → refuerza la clase OXIDADO
           con variabilidad visual real

  Si los datasets no están disponibles localmente, se usa un fallback
  sintético que sólo verifica el pipeline (accuracy ~25%).

Descarga de datasets (requiere kaggle CLI configurado):
  kaggle datasets download tatheerabbas/synthetic-industrial-metal-surface-defects -p /tmp/datasets --unzip
  kaggle datasets download benpepperpots/rust-iron-dataset -p /tmp/datasets --unzip
"""

import os
import shutil
import tempfile

import boto3
import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ── Configuración S3 / LocalStack ─────────────────────────────────────────────

S3_ENDPOINT = os.getenv("AWS_ENDPOINT_URL", "http://localstack:4566")
S3_BUCKET   = os.getenv("S3_BUCKET_NAME", "activos-fijos-documentos-dev")
AWS_KEY     = os.getenv("AWS_ACCESS_KEY_ID", "test")
AWS_SECRET  = os.getenv("AWS_SECRET_ACCESS_KEY", "test")
AWS_REGION  = os.getenv("AWS_REGION", "us-east-1")

s3 = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=AWS_KEY,
    aws_secret_access_key=AWS_SECRET,
    region_name=AWS_REGION,
)


def ensure_bucket() -> None:
    try:
        s3.head_bucket(Bucket=S3_BUCKET)
        print(f"  Bucket '{S3_BUCKET}' ya existe.")
    except Exception:
        s3.create_bucket(Bucket=S3_BUCKET)
        print(f"  Bucket '{S3_BUCKET}' creado.")


def upload_file(local_path: str, s3_key: str) -> None:
    s3.upload_file(local_path, S3_BUCKET, s3_key)
    print(f"  Subido: {s3_key}")


def upload_directory(local_dir: str, s3_prefix: str) -> None:
    for root, _, files in os.walk(local_dir):
        for fname in files:
            local_file = os.path.join(root, fname)
            rel = os.path.relpath(local_file, local_dir)
            key = f"{s3_prefix}/{rel}"
            upload_file(local_file, key)


# ── Datos sintéticos de dominio ───────────────────────────────────────────────

np.random.seed(42)
N = 600

# Features: [edad_anios, num_mantenimientos, confianza_cnn_promedio, categoria_encoded]
edad          = np.random.uniform(0, 15, N)
n_mant        = np.random.randint(0, 20, N).astype(float)
conf_cnn      = np.random.uniform(0.55, 0.99, N)
categoria     = np.random.randint(0, 8, N).astype(float)

X = np.column_stack([edad, n_mant, conf_cnn, categoria])

# Target regresión: meses_restantes (vida útil típica 10 años = 120 meses)
meses_restantes = np.clip(120 - edad * 8 + n_mant * 1.5 + np.random.normal(0, 6, N), 1, 120)

# Target clasificación: fallo en próximos 6 meses (1 = sí, 0 = no)
prob_fallo_raw = 1 / (1 + np.exp(-(edad * 0.3 + n_mant * 0.05 - conf_cnn * 4 - 3)))
# Usar mediana como umbral para garantizar ambas clases en datos sintéticos
y_fallo = (prob_fallo_raw > np.median(prob_fallo_raw)).astype(int)


# ── 1. Random Forest ──────────────────────────────────────────────────────────

print("\n[1/3] Entrenando Random Forest...")

rf_reg = Pipeline([
    ("scaler", StandardScaler()),
    ("model", RandomForestRegressor(n_estimators=80, max_depth=8, random_state=42)),
])
rf_reg.fit(X, meses_restantes)

rf_clf = Pipeline([
    ("scaler", StandardScaler()),
    ("model", RandomForestClassifier(n_estimators=80, max_depth=6, random_state=42)),
])
rf_clf.fit(X, y_fallo)

# Guardamos ambos modelos juntos en un dict para que MLService los use
rf_bundle = {"regressor": rf_reg, "classifier": rf_clf}

rf_path = "/tmp/rf_vida_util.joblib"
joblib.dump(rf_bundle, rf_path)
print(f"  Random Forest guardado → {rf_path}")

# Validación rápida
sample = np.array([[5.0, 3.0, 0.82, 2.0]])
pred_meses = rf_reg.predict(sample)[0]
clf_classes = list(rf_clf.named_steps["model"].classes_)
proba_array = rf_clf.predict_proba(sample)[0]
pred_prob   = proba_array[clf_classes.index(1)] if 1 in clf_classes else 0.0
print(f"  Ejemplo (5 años, 3 mant): {pred_meses:.1f} meses restantes, {pred_prob:.2%} riesgo fallo")


# ── 2. K-Means ────────────────────────────────────────────────────────────────

print("\n[2/3] Entrenando K-Means (3 clusters)...")

km = Pipeline([
    ("scaler", StandardScaler()),
    ("model", KMeans(n_clusters=3, random_state=42, n_init=10)),
])
km.fit(X)

km_path = "/tmp/kmeans_clustering.joblib"
joblib.dump(km, km_path)
print(f"  K-Means guardado → {km_path}")
print(f"  Tamaños de clusters: {np.bincount(km.predict(X))}")


# ── 3. CNN TensorFlow/Keras ───────────────────────────────────────────────────

print("\n[3/3] Construyendo CNN (MobileNetV2 transfer learning)...")

import tensorflow as tf  # noqa: E402

# ── Arquitectura base (MobileNetV2 congelado) ─────────────────────────────────
base = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet",
)
base.trainable = False  # pesos congelados en fase 1

inputs  = tf.keras.Input(shape=(224, 224, 3))
x       = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
x       = base(x, training=False)
x       = tf.keras.layers.GlobalAveragePooling2D()(x)
x       = tf.keras.layers.Dropout(0.3)(x)
outputs = tf.keras.layers.Dense(4, activation="softmax")(x)  # BUENO/DETERIORADO/REQUIERE_MANTENIMIENTO/OXIDADO

model = tf.keras.Model(inputs, outputs)

# Mapeo de clases del dataset sintético → clases del dominio
# Dataset synthetic: normal(0), scratch(1), crack(2), rust(3), hole(4)
# Dominio:           BUENO(0), REQUIERE_MANTENIMIENTO(1), DETERIORADO(2), OXIDADO(3)
_SYNTHETIC_MAP = {
    "normal":   0,  # → BUENO
    "scratch":  1,  # → REQUIERE_MANTENIMIENTO
    "crack":    2,  # → DETERIORADO
    "rust":     3,  # → OXIDADO
    "hole":     2,  # → DETERIORADO (agrupado con crack)
}

# Augmentation pipeline para Fase 1
_augment_phase1 = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal_and_vertical"),
    tf.keras.layers.RandomRotation(0.15),
    tf.keras.layers.RandomZoom(0.1),
    tf.keras.layers.RandomBrightness(0.15),
    tf.keras.layers.RandomContrast(0.15),
], name="augmentation_fase1")

# Augmentation pipeline para Fase 2 (más agresivo — dataset pequeño)
_augment_phase2 = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal_and_vertical"),
    tf.keras.layers.RandomRotation(0.25),
    tf.keras.layers.RandomZoom(0.2),
    tf.keras.layers.RandomBrightness(0.25),
    tf.keras.layers.RandomContrast(0.25),
    tf.keras.layers.RandomTranslation(0.1, 0.1),
], name="augmentation_fase2")

IMG_SIZE = (224, 224)
BATCH    = 32


def load_synthetic_dataset(base_dir: str, split: str):
    """Carga el dataset sintético desde base_dir/{split}/{clase}/*.png
    y aplica el mapeo de clases al dominio de 4 clases."""
    split_dir = os.path.join(base_dir, split)
    if not os.path.isdir(split_dir):
        # Intentar con subcarpeta images/
        split_dir = os.path.join(base_dir, "images", split)
    if not os.path.isdir(split_dir):
        return None, 0

    images, labels = [], []
    n_total = 0
    for class_name, label_idx in _SYNTHETIC_MAP.items():
        class_dir = os.path.join(split_dir, class_name)
        if not os.path.isdir(class_dir):
            continue
        for fname in os.listdir(class_dir):
            fpath = os.path.join(class_dir, fname)
            try:
                img = tf.keras.utils.load_img(fpath, target_size=IMG_SIZE, color_mode="rgb")
                images.append(tf.keras.utils.img_to_array(img))
                labels.append(label_idx)
                n_total += 1
            except Exception:
                pass

    if not images:
        return None, 0

    X = np.array(images, dtype=np.float32)
    y = tf.keras.utils.to_categorical(labels, num_classes=4)
    ds = tf.data.Dataset.from_tensor_slices((X, y)).shuffle(len(X), seed=42).batch(BATCH)
    return ds, n_total


def load_rustguard_dataset(base_dir: str):
    """Carga el Rust-Iron dataset buscando la carpeta CORROSION (en cualquier case).
    Las imágenes de corrosión → OXIDADO(3)."""
    images, labels = [], []
    # Buscar recursivamente la carpeta de corrosión
    corrosion_candidates = [
        os.path.join(base_dir, "train", "train", "CORROSION"),
        os.path.join(base_dir, "train", "CORROSION"),
        os.path.join(base_dir, "CORROSION"),
        os.path.join(base_dir, "train", "train", "corrosion"),
        os.path.join(base_dir, "train", "corrosion"),
        os.path.join(base_dir, "train", "rust"),
        os.path.join(base_dir, "train", "Rust"),
    ]
    for cdir in corrosion_candidates:
        if not os.path.isdir(cdir):
            continue
        for fname in os.listdir(cdir):
            fpath = os.path.join(cdir, fname)
            try:
                img = tf.keras.utils.load_img(fpath, target_size=IMG_SIZE, color_mode="rgb")
                images.append(tf.keras.utils.img_to_array(img))
                labels.append(3)  # OXIDADO
            except Exception:
                pass
        if images:
            print(f"  Rust-Iron: {len(images)} imágenes de corrosión desde {cdir}")
            break

    if not images:
        return None, 0

    X = np.array(images, dtype=np.float32)
    y = tf.keras.utils.to_categorical(labels, num_classes=4)
    ds = tf.data.Dataset.from_tensor_slices((X, y)).shuffle(len(X), seed=42).batch(BATCH)
    return ds, len(images)


# ── Rutas de los datasets ─────────────────────────────────────────────────────
# Por defecto apuntan a ms2/datasets/ (dentro del proyecto).
# Se pueden sobreescribir con variables de entorno.
_SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
_PROJECT_DIR  = os.path.dirname(_SCRIPT_DIR)   # ms2/
_DATASETS_DIR = os.path.join(_PROJECT_DIR, "datasets")

SYNTHETIC_DIR = os.getenv(
    "SYNTHETIC_DATASET_DIR",
    os.path.join(_DATASETS_DIR, "synthetic-industrial-metal-surface-defects", "industrial_defect_dataset"),
)
RUSTGUARD_DIR = os.getenv(
    "RUSTGUARD_DATASET_DIR",
    os.path.join(_DATASETS_DIR, "rust-iron-dataset"),
)

train_ds, n_train = load_synthetic_dataset(SYNTHETIC_DIR, "train")
val_ds,   n_val   = load_synthetic_dataset(SYNTHETIC_DIR, "val")

# ── FASE 1: Entrenamiento base con dataset sintético ─────────────────────────
if train_ds is not None:
    print(f"  Dataset sintético encontrado: {n_train} train / {n_val} val")
    print("  Fase 1 — entrenando cabeza de clasificación (base congelada)...")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    def augment1(x, y):
        return _augment_phase1(x, training=True), y

    train_aug = train_ds.map(augment1, num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)
    val_pref  = val_ds.prefetch(tf.data.AUTOTUNE) if val_ds is not None else None

    callbacks_fase1 = [
        tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True, monitor="val_accuracy"),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=2, monitor="val_loss"),
    ]

    model.fit(
        train_aug,
        validation_data=val_pref,
        epochs=15,
        callbacks=callbacks_fase1,
        verbose=1,
    )
    model.summary()
else:
    print("  AVISO: Dataset sintético no encontrado en", SYNTHETIC_DIR)
    print("  Usando fallback sintético (sólo verifica pipeline, accuracy ~25%).")
    print("  Para entrenar correctamente, descarga el dataset con kaggle CLI:")
    print("    kaggle datasets download tatheerabbas/synthetic-industrial-metal-surface-defects -p /tmp/datasets --unzip")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    N_IMG = 200
    X_img = np.random.uniform(0, 255, (N_IMG, 224, 224, 3)).astype(np.float32)
    y_img = tf.keras.utils.to_categorical(np.random.randint(0, 4, N_IMG), 4)
    print("  Entrenando 3 épocas con datos sintéticos (sólo verifica el pipeline)...")
    model.fit(X_img, y_img, epochs=3, batch_size=8, verbose=1)

# ── FASE 2: Fine-tuning con Rust-Iron Dataset (refuerzo OXIDADO) ──────────────
rust_ds, n_rust = load_rustguard_dataset(RUSTGUARD_DIR)

if rust_ds is not None:
    print(f"\n  Fase 2 — fine-tuning con {n_rust} imágenes reales de corrosión (Rust-Iron)...")
    # Descongelar las últimas 30 capas de MobileNetV2 para fine-tuning
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),  # LR más bajo para fine-tuning
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    def augment2(x, y):
        return _augment_phase2(x, training=True), y

    rust_aug = rust_ds.map(augment2, num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)

    callbacks_fase2 = [
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="loss"),
    ]

    model.fit(
        rust_aug,
        epochs=10,
        callbacks=callbacks_fase2,
        verbose=1,
    )
    print("  Fine-tuning completado.")
else:
    print("\n  AVISO: Rust-Iron Dataset no encontrado en", RUSTGUARD_DIR)
    print("  La clase OXIDADO sólo se apoyará en datos sintéticos.")
    print("  Para mejores resultados, descarga el dataset con kaggle CLI:")
    print("    kaggle datasets download benpepperpots/rust-iron-dataset -p /tmp/datasets --unzip")

cnn_path = "/tmp/cnn_estado_activo.keras"
model.save(cnn_path)  # formato nativo Keras 3 (.keras)
print(f"  CNN guardada → {cnn_path}")


# ── Subir todo a S3 ───────────────────────────────────────────────────────────

print("\n[Subiendo modelos a S3...]")
ensure_bucket()

upload_file(rf_path,   "models/rf_vida_util.joblib")
upload_file(km_path,   "models/kmeans_clustering.joblib")
upload_file(cnn_path,  "models/cnn_estado_activo.keras")

print("\n✓ Todos los modelos subidos correctamente.")
print("  Reinicia el contenedor ms2-documentos para que los cargue:")
print("  docker compose restart ms2-documentos")
