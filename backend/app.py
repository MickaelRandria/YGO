from __future__ import annotations

import html
import os
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, abort, jsonify, request, send_from_directory
from flask_cors import CORS

from card_detector import crop_name_band, generate_name_zone_variants, inspect_card_detection
from card_matcher import CardMatcher, MATCHING_LANGUAGE
from ocr_reader import OCR_LANGUAGE, read_all_variants, warmup_ocr

app = Flask(__name__)
configured_origins = os.getenv('ALLOWED_ORIGIN')
# In production, ALLOWED_ORIGIN restricts CORS to the Vercel app. In local
# development, this accepts only localhost and RFC 1918 Wi-Fi origins on Vite.
allowed_origins = [origin.strip() for origin in configured_origins.split(',') if origin.strip()] if configured_origins else (
    r'^http://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|'
    r'192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):5173$'
)
CORS(app, resources={r'/api/*': {'origins': allowed_origins}})
matcher = CardMatcher()  # cache is loaded once, at process startup
DEBUG_OUTPUT = Path(__file__).parent / 'debug_output'


def _reset_debug_output() -> None:
    DEBUG_OUTPUT.mkdir(exist_ok=True)
    for file_path in DEBUG_OUTPUT.iterdir():
        if file_path.is_file():
            file_path.unlink()


def _save_debug_image(filename: str, image: np.ndarray) -> str:
    cv2.imwrite(str(DEBUG_OUTPUT / filename), image)
    return f'/api/debug/files/{filename}'


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok', 'cached_cards': len(matcher.names)})


@app.get('/api/debug/files/<path:filename>')
def debug_file(filename: str):
    if Path(filename).name != filename:
        abort(404)
    return send_from_directory(DEBUG_OUTPUT, filename)


@app.get('/api/debug/last')
def debug_last():
    DEBUG_OUTPUT.mkdir(exist_ok=True)
    files = sorted(path for path in DEBUG_OUTPUT.iterdir() if path.is_file())
    if not files:
        return '<h1>YGO Referee debug</h1><p>Aucun scan exécuté avec <code>?debug=true</code>.</p>'
    fragments = ['<h1>YGO Referee — dernier scan debug</h1>']
    for file_path in files:
        label = html.escape(file_path.name)
        url = f'/api/debug/files/{file_path.name}'
        if file_path.suffix.lower() in {'.jpg', '.jpeg', '.png'}:
            fragments.append(f'<section><h2>{label}</h2><img src="{url}" alt="{label}" style="max-width:100%;height:auto"></section>')
        else:
            content = html.escape(file_path.read_text(encoding='utf-8', errors='replace'))
            fragments.append(f'<section><h2>{label}</h2><pre>{content}</pre></section>')
    return '<!doctype html><html><body style="font-family:system-ui;margin:20px">' + ''.join(fragments) + '</body></html>'


@app.post('/api/scan')
def scan():
    debug_enabled = request.args.get('debug', '').lower() == 'true'
    image_file = request.files.get('image')
    if image_file is None or not image_file.filename:
        return jsonify({'error': 'Le champ multipart « image » est requis.'}), 400
    image = cv2.imdecode(np.frombuffer(image_file.read(), np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({'error': 'Image illisible.'}), 400

    image_height, image_width = image.shape[:2]
    print(f'[SCAN] Image reçue: {image_width}x{image_height}px')
    debug: dict[str, object] | None = None
    debug_files: list[str] = []
    if debug_enabled:
        _reset_debug_output()
        original_url = _save_debug_image('01_original.jpg', image)
        debug_files.append(original_url)

    inspection = inspect_card_detection(image)
    print(f'[SCAN] Contours détectés: {inspection.contours_found}')
    print(f'[SCAN] Contours retenus après filtre ratio/aire: {inspection.candidates_found}')
    if inspection.candidates_found == 0:
        print('[SCAN] Aucune carte retenue, utilisation du cadre complet pour diagnostiquer l’OCR')
    if debug_enabled:
        contours_url = _save_debug_image('02_contours.jpg', inspection.annotated_image)
        debug_files.append(contours_url)
        debug = {
            'matching_language': MATCHING_LANGUAGE,
            'ocr_language': OCR_LANGUAGE,
            'original_image_size': [image_width, image_height],
            'contours_found': inspection.contours_found,
            'cards_detected': inspection.candidates_found,
            'used_full_frame_fallback': inspection.used_full_frame_fallback,
            'detection_details': inspection.details,
            'ocr_results_by_variant': {},
            'winning_variant': None,
            'final_match': None,
            'final_fuzzy_score': 0,
            'match_source': None,
            'final_paddle_confidence': 0,
            'files': debug_files,
            'ocr_details': [],
        }

    cards = []
    for card_index, card in enumerate(inspection.cards, start=1):
        if debug_enabled:
            cropped_url = _save_debug_image(f'03_cropped_card_{card_index}.jpg', card)
            debug_files.append(cropped_url)
        name_zone = crop_name_band(card)
        zone_height, zone_width = name_zone.shape[:2]
        print(f'[SCAN] Zone nom {card_index} recadrée: {zone_width}x{zone_height}px')
        variants = generate_name_zone_variants(name_zone)
        variant_urls: dict[str, str] = {}
        if debug_enabled:
            for variant_name, variant_image in variants.items():
                variant_url = _save_debug_image(f'04_name_zone_{card_index}_variant_{variant_name}.jpg', variant_image)
                variant_urls[variant_name] = variant_url
                debug_files.append(variant_url)
        ocr_results = read_all_variants(variants)
        ocr_debug_results = {
            variant_name: {'text': result.text, 'paddle_confidence': result.paddle_confidence}
            for variant_name, result in ocr_results.items()
        }
        raw_text_urls: dict[str, str] = {}
        for variant_name, result in ocr_results.items():
            print(f'[SCAN] OCR {card_index} [{variant_name}]: {result.text!r} (Paddle: {result.paddle_confidence:.2f})')
            if debug_enabled:
                filename = f'05_ocr_raw_{card_index}_{variant_name}.txt'
                (DEBUG_OUTPUT / filename).write_text(result.text, encoding='utf-8')
                raw_text_urls[variant_name] = f'/api/debug/files/{filename}'
                debug_files.append(raw_text_urls[variant_name])
        name, confidence, winning_variant, paddle_confidence, combined_score, match_source = matcher.match_best_across_variants(ocr_results)
        print(f'[SCAN] Source du match {card_index}: {match_source}')
        print(f'[SCAN] Meilleur match fuzzy {card_index}: {name!r} (fuzzy: {confidence}, Paddle: {paddle_confidence:.2f}, combiné: {combined_score:.2f}, variante: {winning_variant})')
        if debug is not None:
            ocr_details = debug['ocr_details']
            assert isinstance(ocr_details, list)
            ocr_details.append({
                'card_index': card_index,
                'ocr_results_by_variant': ocr_debug_results,
                'fuzzy_match': name or None,
                'final_fuzzy_score': confidence,
                'match_source': match_source,
                'final_paddle_confidence': paddle_confidence,
                'combined_score': round(combined_score, 4),
                'winning_variant': winning_variant,
                'cropped_card_saved': cropped_url,
                'name_zone_variants_saved': variant_urls,
                'ocr_text_files_saved': raw_text_urls,
            })
        if not name:
            continue
        result = {'name': name, 'confidence': confidence}
        if confidence < 70:
            result['uncertain'] = True
        cards.append(result)

    if debug is not None:
        ocr_details = debug['ocr_details']
        assert isinstance(ocr_details, list)
        if len(ocr_details) == 1:
            debug['ocr_results_by_variant'] = ocr_details[0]['ocr_results_by_variant']
            debug['winning_variant'] = ocr_details[0]['winning_variant']
            debug['final_match'] = ocr_details[0]['fuzzy_match']
            debug['final_fuzzy_score'] = ocr_details[0]['final_fuzzy_score']
            debug['match_source'] = ocr_details[0]['match_source']
            debug['final_paddle_confidence'] = ocr_details[0]['final_paddle_confidence']
        debug['files'] = debug_files
    response: dict[str, object] = {'cards': cards}
    if debug is not None:
        response['debug'] = debug
    return jsonify(response)


if __name__ == '__main__':
    warmup_ocr()
    app.run(host='0.0.0.0', port=5000, debug=True)
