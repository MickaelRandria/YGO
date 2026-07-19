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
        result = process.extractOne(text, self.names, scorer=fuzz.WRatio, processor=str.lower)
        if result is None:
            return '', 0
        name, score, _ = result
        return str(name), int(round(score))
