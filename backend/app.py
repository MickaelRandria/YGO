from __future__ import annotations

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from card_detector import crop_name_band, detect_cards
from card_matcher import CardMatcher
from ocr_reader import read_card_name

app = Flask(__name__)
CORS(app, resources={r'/api/*': {'origins': ['http://localhost:5173', 'http://127.0.0.1:5173']}})
matcher = CardMatcher()  # cache is loaded once, at process startup


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok', 'cached_cards': len(matcher.names)})


@app.post('/api/scan')
def scan():
    image_file = request.files.get('image')
    if image_file is None or not image_file.filename:
        return jsonify({'error': 'Le champ multipart « image » est requis.'}), 400
    image = cv2.imdecode(np.frombuffer(image_file.read(), np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({'error': 'Image illisible.'}), 400
    cards = []
    for card in detect_cards(image):
        raw_text = read_card_name(crop_name_band(card))
        name, confidence = matcher.match(raw_text)
        if not name:
            continue
        result = {'name': name, 'confidence': confidence}
        if confidence < 70:
            result['uncertain'] = True
        cards.append(result)
    return jsonify({'cards': cards})


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
