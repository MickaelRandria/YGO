"""Singleton EasyOCR reader and title-strip text extraction."""
from __future__ import annotations

import re
import easyocr
import cv2
import numpy as np

_reader = easyocr.Reader(['en'], gpu=False, verbose=False)


def read_card_name(name_band: np.ndarray) -> str:
    if name_band is None or name_band.size == 0:
        return ''
    gray = cv2.cvtColor(name_band, cv2.COLOR_BGR2GRAY)
    # Try both natural contrast and a sharpened adaptive threshold; card colours vary.
    enhanced = cv2.detailEnhance(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR), sigma_s=10, sigma_r=0.15)
    variants = [name_band, enhanced]
    best = ''
    for variant in variants:
        words = _reader.readtext(variant, detail=0, paragraph=True)
        candidate = ' '.join(words)
        if len(candidate) > len(best):
            best = candidate
    return normalize_text(best)


def normalize_text(value: str) -> str:
    value = value.replace('|', 'I').replace('’', "'")
    value = re.sub(r"[^A-Za-z0-9 '\-]", ' ', value)
    return re.sub(r'\s+', ' ', value).strip().lower()
