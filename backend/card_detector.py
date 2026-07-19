"""OpenCV helpers for extracting one or more Yu-Gi-Oh! cards from a photo."""
from __future__ import annotations

import cv2
import numpy as np

CARD_RATIO = 0.68  # width / height of a standard Yu-Gi-Oh! card
MIN_RATIO, MAX_RATIO = 0.52, 0.84


def _order_points(points: np.ndarray) -> np.ndarray:
    points = points.astype("float32")
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1).reshape(-1)
    return np.array([points[np.argmin(sums)], points[np.argmin(diffs)], points[np.argmax(sums)], points[np.argmax(diffs)]], dtype="float32")


def _warp_card(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    top_left, top_right, bottom_right, bottom_left = _order_points(points)
    width = int(max(np.linalg.norm(bottom_right - bottom_left), np.linalg.norm(top_right - top_left)))
    height = int(max(np.linalg.norm(top_right - bottom_right), np.linalg.norm(top_left - bottom_left)))
    if width < 30 or height < 30:
        return image
    if width > height:
        width, height = height, width
        # A landscape contour cannot be a usable upright card without a rotation.
        rotated = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        return cv2.resize(rotated, (int(height * CARD_RATIO), height))
    destination = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype="float32")
    return cv2.warpPerspective(image, cv2.getPerspectiveTransform(np.array([top_left, top_right, bottom_right, bottom_left]), destination), (width, height))


def detect_cards(image: np.ndarray) -> list[np.ndarray]:
    """Return perspective-corrected cards, ordered from top-left to bottom-right.

    A full-frame image remains a valid single-card fallback when contours are not
    reliable; this avoids rejecting close-up camera photos.
    """
    if image is None or image.size == 0:
        return []
    height, width = image.shape[:2]
    minimum_area = max(2_500, int(width * height * 0.025))
    scaled = cv2.GaussianBlur(image, (5, 5), 0)
    gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 45, 130)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[tuple[float, float, np.ndarray]] = []
    for contour in contours:
        if cv2.contourArea(contour) < minimum_area:
            continue
        rectangle = cv2.minAreaRect(contour)
        box_width, box_height = rectangle[1]
        if not box_width or not box_height:
            continue
        ratio = min(box_width, box_height) / max(box_width, box_height)
        if not MIN_RATIO <= ratio <= MAX_RATIO:
            continue
        points = cv2.boxPoints(rectangle)
        center_x, center_y = rectangle[0]
        candidates.append((center_y, center_x, _warp_card(image, points)))
    if not candidates:
        return [image]
    candidates.sort(key=lambda candidate: (round(candidate[0] / max(1, height) * 6), candidate[1]))
    return [card for _, _, card in candidates]


def crop_name_band(card: np.ndarray) -> np.ndarray:
    """Crop and enhance the upper title strip for lightweight Tesseract OCR."""
    height, width = card.shape[:2]
    top = max(0, int(height * 0.055))
    bottom = max(top + 1, int(height * 0.19))
    left, right = int(width * 0.055), max(1, int(width * 0.945))
    band = card[top:bottom, left:right]
    gray = cv2.cvtColor(band, cv2.COLOR_BGR2GRAY)
    contrast = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    denoised = cv2.GaussianBlur(contrast, (3, 3), 0)
    thresholded = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 7
    )
    return cv2.resize(thresholded, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
