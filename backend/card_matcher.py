"""French OCR matching reference: personal collection first, YGOPRODeck second."""
from __future__ import annotations

import json
import time
from pathlib import Path

from rapidfuzz import fuzz, process
import requests

API_CACHE_PATH = Path(__file__).parent / 'cache' / 'card_names_fr_api.json'
COLLECTION_CACHE_PATH = Path(__file__).parent / 'cache' / 'card_names_fr_collection.json'
CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
CARD_API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
MATCHING_LANGUAGE = 'fr'


def _read_name_cache(cache_path: Path) -> list[str]:
    """Read a simple JSON list; an absent personal collection is normal."""
    if not cache_path.exists():
        return []
    try:
        data = json.loads(cache_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as exc:
        print(f'[INIT] Cache de noms ignoré ({cache_path.name}) : {exc}')
        return []
    if not isinstance(data, list):
        print(f'[INIT] Cache de noms ignoré ({cache_path.name}) : une liste JSON est attendue.')
        return []
    return sorted({str(name).strip() for name in data if str(name).strip()})


def load_api_card_names() -> list[str]:
    """Read or refresh the 30-day French API cache."""
    API_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if API_CACHE_PATH.exists() and time.time() - API_CACHE_PATH.stat().st_mtime < CACHE_MAX_AGE_SECONDS:
        return _read_name_cache(API_CACHE_PATH)
    response = requests.get(CARD_API, params={'language': MATCHING_LANGUAGE}, timeout=45)
    response.raise_for_status()
    data = response.json().get('data', [])
    names = sorted({card['name'] for card in data if card.get('name')})
    API_CACHE_PATH.write_text(json.dumps(names, ensure_ascii=False), encoding='utf-8')
    return names


def load_collection_card_names() -> list[str]:
    """Load the optional cache extracted from the user's Excel collection."""
    return _read_name_cache(COLLECTION_CACHE_PATH)


class CardMatcher:
    def __init__(self) -> None:
        self.collection_names = set(load_collection_card_names())
        self.api_names = set(load_api_card_names())
        self.names = sorted(self.collection_names | self.api_names)
        print(
            '[INIT] Référentiel de matching français chargé : '
            f'{len(self.names)} noms ({len(self.collection_names)} collection Excel, '
            f'{len(self.api_names)} API YGOPRODeck).'
        )

    def source_for_name(self, name: str) -> str | None:
        """Prefer the physically verified Excel spelling when both sources have it."""
        if name in self.collection_names:
            return 'excel_collection'
        if name in self.api_names:
            return 'api_ygoprodeck'
        return None

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

    def match_best_across_variants(self, ocr_results: dict[str, object]) -> tuple[str, int, str | None, float, float, str | None]:
        """Pick the candidate with the best combined fuzzy and PaddleOCR score."""
        best_name, best_fuzzy, best_variant, best_paddle, best_combined = '', 0, None, 0.0, 0.0
        for variant_name, result in ocr_results.items():
            text = str(getattr(result, 'text', ''))
            paddle_confidence = float(getattr(result, 'paddle_confidence', 0.0))
            name, score = self.match(text)
            combined = (score / 100) * paddle_confidence
            if name and combined > best_combined:
                best_name, best_fuzzy, best_variant = name, score, variant_name
                best_paddle, best_combined = paddle_confidence, combined
        return best_name, best_fuzzy, best_variant, best_paddle, best_combined, self.source_for_name(best_name)
