"""Local PP-OCRv5 reader for Yu-Gi-Oh! card-name strips."""
from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

import numpy as np
import cv2
from paddleocr import PaddleOCR


@dataclass(frozen=True)
class OcrRead:
    text: str
    paddle_confidence: float


_ocr_engine: PaddleOCR | None = None
OCR_LANGUAGE = 'fr'


def get_ocr_engine() -> PaddleOCR:
    """Create one French, CPU-only PP-OCRv5 engine per Python process."""
    global _ocr_engine
    if _ocr_engine is None:
        print('[INIT] Chargement de PaddleOCR (premier lancement : téléchargement des modèles, peut prendre 1-2 minutes)...')
        print('[INIT] Modèle de reconnaissance français (Latin) en cours de téléchargement si nécessaire...')
        _ocr_engine = PaddleOCR(
            # PaddleOCR maps French to its PP-OCRv5 Latin model, including
            # French accented characters. Keep the language explicit so it
            # cannot accidentally fall back to the English-only model.
            lang=OCR_LANGUAGE,
            ocr_version='PP-OCRv5',
            device='cpu',
            enable_mkldnn=False,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=True,
        )
        print('[INIT] PaddleOCR prêt.')
    return _ocr_engine


def warmup_ocr() -> None:
    get_ocr_engine()


def _result_payload(result: Any) -> dict[str, Any]:
    """Normalise PaddleOCR 3 result objects to their documented ``res`` dict."""
    payload = getattr(result, 'json', result)
    if callable(payload):
        payload = payload()
    if not isinstance(payload, dict):
        return {}
    candidate = payload.get('res', payload)
    return candidate if isinstance(candidate, dict) else {}


def _clean_title_text(text: str) -> str:
    """Remove French or English Spell/Trap type labels from the title band."""
    return re.sub(
        r'\s+(?:'
        r'CARTE\s+(?:MAGIE|PIÈGE)(?:\s+(?:JEU[ -]?RAPIDE|CONTINUE|DE TERRAIN|D[’\']ÉQUIPEMENT|RITUELLE?|CONTRE))?'
        r'|(?:(?:QUICK[ -]?PLAY|CONTINUOUS|FIELD|EQUIP|RITUAL|COUNTER)\s+)?(?:SPELL|TRAP)\s+CAR(?:D)?'
        r')(?:\s+.*)?$',
        '',
        text,
        flags=re.IGNORECASE,
    ).strip()


def read_card_name(cropped_image_np: np.ndarray) -> OcrRead:
    """Read one card-name strip and average confidence over its ordered words."""
    if cropped_image_np is None or cropped_image_np.size == 0:
        return OcrRead('', 0.0)
    if cropped_image_np.ndim == 2:
        cropped_image_np = cv2.cvtColor(cropped_image_np, cv2.COLOR_GRAY2BGR)

    height, width = cropped_image_np.shape[:2]
    if width > 1800:
        scale = 1800 / width
        cropped_image_np = cv2.resize(cropped_image_np, (1800, max(1, int(height * scale))), interpolation=cv2.INTER_AREA)

    payload: dict[str, Any] = {}
    for result in get_ocr_engine().predict(cropped_image_np):
        payload = _result_payload(result)
        if payload:
            break
    texts = list(payload.get('rec_texts') or [])
    scores = list(payload.get('rec_scores') or [])
    polygons = list(payload.get('rec_polys') or [])
    if not texts:
        return OcrRead('', 0.0)

    ordered: list[tuple[float, str, float]] = []
    for index, text in enumerate(texts):
        value = str(text).strip()
        if not value:
            continue
        score = float(scores[index]) if index < len(scores) else 0.0
        x_position = float(polygons[index][0][0]) if index < len(polygons) else float(index)
        ordered.append((x_position, value, score))
    if not ordered:
        return OcrRead('', 0.0)
    ordered.sort(key=lambda segment: segment[0])
    return OcrRead(
        _clean_title_text(' '.join(segment[1] for segment in ordered)),
        round(sum(segment[2] for segment in ordered) / len(ordered), 4),
    )


def read_all_variants(variants: dict[str, np.ndarray]) -> dict[str, OcrRead]:
    """Run PP-OCRv5 over each gentle pre-processing variant."""
    return {variant_name: read_card_name(image) for variant_name, image in variants.items()}
