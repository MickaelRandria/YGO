"""OpenCV helpers for extracting Yu-Gi-Oh! cards and inspecting contour filters."""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

CARD_RATIO = 0.68  # width / height of a standard Yu-Gi-Oh! card
MIN_RATIO, MAX_RATIO = 0.52, 0.84


@dataclass
class DetectionInspection:
    cards: list[np.ndarray]
    candidates_found: int
    contours_found: int
    details: list[dict[str, float | int | str | None]]
    annotated_image: np.ndarray
    used_full_frame_fallback: bool


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


def inspect_card_detection(image: np.ndarray) -> DetectionInspection:
    """Run the existing detector and retain every decision for debug visualisation."""
    if image is None or image.size == 0:
        return DetectionInspection([], 0, 0, [], image, False)
    height, width = image.shape[:2]
    minimum_area = max(2_500, int(width * height * 0.025))
    scaled = cv2.GaussianBlur(image, (5, 5), 0)
    gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 45, 130)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    annotated = image.copy()
    candidates: list[tuple[float, float, np.ndarray]] = []
    details: list[dict[str, float | int | str | None]] = []

    for contour_index, contour in enumerate(contours):
        area = float(cv2.contourArea(contour))
        rectangle = cv2.minAreaRect(contour)
        box_width, box_height = rectangle[1]
        ratio = min(box_width, box_height) / max(box_width, box_height) if box_width and box_height else None
        rejected_reason: str | None = None
        if area < minimum_area:
            rejected_reason = f'aire trop petite (min attendu: {minimum_area}px)'
        elif ratio is None:
            rejected_reason = 'rectangle invalide (largeur ou hauteur nulle)'
        elif not MIN_RATIO <= ratio <= MAX_RATIO:
            rejected_reason = f'aspect ratio hors plage (attendu ~{CARD_RATIO}, min {MIN_RATIO}, max {MAX_RATIO})'

        is_candidate = rejected_reason is None
        color = (0, 180, 0) if is_candidate else (0, 0, 255)
        cv2.drawContours(annotated, [contour], -1, color, 2)
        details.append({
            'contour_index': contour_index,
            'area': round(area, 2),
            'aspect_ratio': round(float(ratio), 3) if ratio is not None else None,
            'rejected_reason': rejected_reason,
        })
        if not is_candidate:
            continue
        points = cv2.boxPoints(rectangle)
        center_x, center_y = rectangle[0]
        candidates.append((center_y, center_x, _warp_card(image, points)))

    candidates.sort(key=lambda candidate: (round(candidate[0] / max(1, height) * 6), candidate[1]))
    detected_cards = [card for _, _, card in candidates]
    # Keep the existing close-up fallback, but surface it clearly in debug data.
    used_full_frame_fallback = not detected_cards
    return DetectionInspection(
        cards=detected_cards if detected_cards else [image],
        candidates_found=len(detected_cards),
        contours_found=len(contours),
        details=details,
        annotated_image=annotated,
        used_full_frame_fallback=used_full_frame_fallback,
    )


def detect_cards(image: np.ndarray) -> list[np.ndarray]:
    """Return perspective-corrected cards while preserving the public helper API."""
    return inspect_card_detection(image).cards


def crop_name_band(card: np.ndarray) -> np.ndarray:
    """Crop only the printed title, excluding the artwork and most of the icon."""
    height, width = card.shape[:2]
    # The broader 5.5–19% band also captured the stars and the illustration on
    # real photos.  That visual noise makes Tesseract reject an otherwise clear
    # title.  These limits keep the title line itself and leave the attribute
    # icon out of the OCR input.
    top = max(0, int(height * 0.055))
    bottom = max(top + 1, int(height * 0.165))
    left, right = int(width * 0.055), max(1, int(width * 0.84))
    return card[top:bottom, left:right]


def generate_name_zone_variants(cropped_bgr_image: np.ndarray) -> dict[str, np.ndarray]:
    """Generate OCR candidates suited to the varied Yu-Gi-Oh! name backgrounds."""
    variants: dict[str, np.ndarray] = {}
    variants['color_upscaled'] = cv2.resize(cropped_bgr_image, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(cropped_bgr_image, cv2.COLOR_BGR2GRAY)
    contrast = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    variants['gray_clahe'] = cv2.resize(contrast, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants['otsu'] = cv2.resize(otsu, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    _, otsu_inverted = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    variants['otsu_inverted'] = cv2.resize(otsu_inverted, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    variants['gray_upscaled'] = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    return variants
