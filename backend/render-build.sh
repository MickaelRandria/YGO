#!/usr/bin/env bash
set -euo pipefail
apt-get update
apt-get install -y --no-install-recommends tesseract-ocr
pip install -r requirements.txt
