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


def read_card_name_raw(name_band: np.ndarray) -> str:
    if name_band is None or name_band.size == 0:
        return ''
    return pytesseract.image_to_string(Image.fromarray(name_band), config='--psm 7').strip()


def read_card_name(name_band: np.ndarray) -> str:
    return normalize_text(read_card_name_raw(name_band))


def normalize_text(value: str) -> str:
    value = value.replace('|', 'I').replace('’', "'")
    value = re.sub(r"[^A-Za-z0-9 '\-]", ' ', value)
    return re.sub(r'\s+', ' ', value).strip().lower()
