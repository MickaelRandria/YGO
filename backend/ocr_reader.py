"""Lightweight Tesseract OCR for a pre-processed card title strip."""
from __future__ import annotations

import os
import re
from pathlib import Path

import numpy as np
import pytesseract
from PIL import Image

configured_binary = os.getenv('TESSERACT_CMD')
windows_default_binary = Path(r'C:\Program Files\Tesseract-OCR\tesseract.exe')
if configured_binary:
    pytesseract.pytesseract.tesseract_cmd = configured_binary
elif os.name == 'nt' and windows_default_binary.exists():
    pytesseract.pytesseract.tesseract_cmd = str(windows_default_binary)


def _is_usable_ocr_text(text: str) -> bool:
    """Discard OCR noise before it can win a fuzzy match by accident."""
    letters = sum(character.isalpha() for character in text)
    words = re.findall(r'[A-Za-z]+', text)
    return (
        8 <= letters
        and len(text) <= 120
        and letters / max(1, len(text)) >= 0.35
        and any(len(word) >= 5 for word in words)
    )


def read_all_variants(variants: dict[str, np.ndarray]) -> dict[str, str]:
    """Run both relevant Tesseract line modes on every image variant.

    ``psm 13`` skips layout analysis and is best for photographed cards with a
    visible pixel grid. If no useful text is obtained, a single ``psm 6``
    fallback handles clean card renders with a little surrounding decoration.
    This keeps the normal path at five OCR calls, not ten.
    """
    results: dict[str, str] = {}
    for variant_name, image in variants.items():
        pil_image = Image.fromarray(image)
        text = pytesseract.image_to_string(pil_image, config='--oem 3 --psm 13').strip()
        results[variant_name] = text if text != '-' and _is_usable_ocr_text(text) else ''
    if any(results.values()):
        return results

    fallback = pytesseract.image_to_string(
        Image.fromarray(variants['color_upscaled']),
        config='--oem 3 --psm 6',
    ).strip()
    results['color_upscaled_psm6_fallback'] = (
        fallback if fallback != '-' and _is_usable_ocr_text(fallback) else ''
    )
    return results


def normalize_text(value: str) -> str:
    value = value.replace('|', 'I').replace('’', "'")
    value = re.sub(r"[^A-Za-z0-9 '\-]", ' ', value)
    return re.sub(r'\s+', ' ', value).strip().lower()
