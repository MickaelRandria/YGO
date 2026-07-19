"""Lightweight Tesseract OCR for a pre-processed card title strip."""
from __future__ import annotations

import re
import numpy as np
import pytesseract
from PIL import Image


def read_card_name(name_band: np.ndarray) -> str:
    if name_band is None or name_band.size == 0:
        return ''
    pil_image = Image.fromarray(name_band)
    text = pytesseract.image_to_string(pil_image, config='--psm 7')
    return normalize_text(text)


def normalize_text(value: str) -> str:
    value = value.replace('|', 'I').replace('’', "'")
    value = re.sub(r"[^A-Za-z0-9 '\-]", ' ', value)
    return re.sub(r'\s+', ' ', value).strip().lower()
