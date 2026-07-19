"""Lightweight Tesseract OCR for a pre-processed card title strip."""
from __future__ import annotations

import re
import os
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
