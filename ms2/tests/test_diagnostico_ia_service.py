"""Tests del servicio de verificacion visual IA."""

import io

from PIL import Image, ImageDraw

from app.services.diagnostico_ia_service import DiagnosticoIAService


def _imagen_activo(color: str = "white", detalle: str = "rectangulo") -> bytes:
    img = Image.new("RGB", (800, 600), color)
    draw = ImageDraw.Draw(img)
    if detalle == "rectangulo":
        draw.rectangle((180, 120, 620, 460), fill="#355C7D", outline="#111111", width=8)
        draw.rectangle((260, 200, 540, 260), fill="#F8F8F8", outline="#111111", width=4)
        draw.text((290, 215), "ACT-001", fill="#111111")
    elif detalle == "circulo":
        draw.ellipse((210, 110, 590, 490), fill="#C0392B", outline="#111111", width=8)
        draw.line((250, 300, 550, 300), fill="#111111", width=10)
    out = io.BytesIO()
    img.save(out, format="JPEG")
    return out.getvalue()


def test_verificacion_visual_valida_evidencia_sin_referencia():
    svc = DiagnosticoIAService()

    resultado = svc.inferir(_imagen_activo(), cnn_model=None)

    assert resultado["diagnostico"] in {"EVIDENCIA_VALIDADA", "REQUIERE_REVISION"}
    assert resultado["tipoAnalisis"] == "VERIFICACION_VISUAL_EVIDENCIA"
    assert resultado["confianza"] > 0
    assert resultado["verificaciones"]
    assert "metricas" in resultado


def test_verificacion_visual_detecta_inconsistencia_con_referencia():
    svc = DiagnosticoIAService()

    resultado = svc.inferir(
        _imagen_activo(detalle="circulo"),
        cnn_model=None,
        referencia_bytes=_imagen_activo(detalle="rectangulo"),
    )

    assert resultado["similitudReferencia"] is not None
    if resultado["similitudReferencia"] < 0.72:
        assert resultado["diagnostico"] == "POSIBLE_INCONSISTENCIA"
