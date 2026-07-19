"""Local 30-day cache of official YGOPRODeck English card names."""
from __future__ import annotations

import json
import time
from pathlib import Path
from rapidfuzz import fuzz, process
import requests

CACHE_PATH = Path(__file__).parent / 'cache' / 'card_names.json'
CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
CARD_API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'


def load_card_names() -> list[str]:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if CACHE_PATH.exists() and time.time() - CACHE_PATH.stat().st_mtime < CACHE_MAX_AGE_SECONDS:
        return json.loads(CACHE_PATH.read_text(encoding='utf-8'))
    response = requests.get(CARD_API, timeout=45)
    response.raise_for_status()
    data = response.json().get('data', [])
    names = sorted({card['name'] for card in data if card.get('name')})
    CACHE_PATH.write_text(json.dumps(names, ensure_ascii=False), encoding='utf-8')
    return names


class CardMatcher:
    def __init__(self) -> None:
        self.names = load_card_names()

    def match(self, text: str) -> tuple[str, int]:
        if not text or not self.names:
            return '', 0
        # A full-string ratio is safer for OCR: WRatio can overvalue a tiny
        # substring (for example matching noisy "...EVA..." to the card "Eva").
        result = process.extractOne(text, self.names, scorer=fuzz.ratio, processor=str.lower)
        if result is None:
            return '', 0
        name, score, _ = result
        return str(name), int(round(score))

    def match_best_across_variants(self, ocr_results: dict[str, str]) -> tuple[str, int, str | None]:
        """Return the highest fuzzy score across every OCR preprocessing variant."""
        best_name, best_score, best_variant = '', 0, None
        for variant_name, text in ocr_results.items():
            name, score = self.match(text)
            if name and score > best_score:
                best_name, best_score, best_variant = name, score, variant_name
        return best_name, best_score, best_variant
