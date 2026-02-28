"""
Anti-Filter Bubble Diversity Service.

Detects repetitive category suggestions and injects diversity by:
 1. Penalising categories that have been over-recommended.
 2. Boosting under-represented categories.
 3. Ensuring each result set spans at least 2 distinct categories.
"""

from typing import List, Dict, Tuple
from collections import Counter


# How many recent recommendations to consider for repetition detection
HISTORY_WINDOW = 10
# If a category appears more than this fraction of the window → repetitive
REPETITION_THRESHOLD = 0.5


def compute_diversity_scores(
    candidates: List[dict],
    recommendation_history: List[str],   # list of recent sub_categories
) -> Dict[int, float]:
    """
    For each candidate, compute a diversity score in [0, 1].
    High score = this category is fresh.  Low score = over-recommended.
    """
    window = recommendation_history[-HISTORY_WINDOW:]
    category_counts = Counter(window)
    total = len(window) if window else 1

    scores: Dict[int, float] = {}
    for rec in candidates:
        sub_cat = rec.get("sub_category", "general")
        freq = category_counts.get(sub_cat, 0) / total

        # Diversity score inversely proportional to recent frequency
        if freq >= REPETITION_THRESHOLD:
            score = 0.1   # heavily suppressed
        elif freq > 0:
            score = 1.0 - freq * 1.5
        else:
            score = 1.0   # never seen before → maximum diversity

        scores[rec["id"]] = max(0.0, min(1.0, score))

    return scores


def ensure_category_diversity(
    ranked: List[dict],
    min_categories: int = 2,
    pool: List[dict] = None,
) -> List[dict]:
    """
    Post-process ranked list: guarantee at least `min_categories` distinct
    sub_category values. If needed, swap in items from the pool.
    """
    seen_categories = set()
    result = []

    for item in ranked:
        seen_categories.add(item.get("sub_category"))
        result.append(item)

    if len(seen_categories) >= min_categories or not pool:
        return result

    # Identify missing categories and inject one item per missing category
    pool_by_cat: Dict[str, list] = {}
    for p in pool:
        cat = p.get("sub_category")
        if cat not in seen_categories:
            pool_by_cat.setdefault(cat, []).append(p)

    for cat, items in pool_by_cat.items():
        if len(seen_categories) >= min_categories:
            break
        if items:
            # Replace the last item in result with a diverse pick
            diverse_item = items[0]
            result[-1] = diverse_item
            seen_categories.add(cat)

    return result


def detect_filter_bubble(recommendation_history: List[str]) -> Tuple[bool, str]:
    """
    Detect if recent recommendations form a filter bubble.
    Returns (is_bubble, description).
    """
    window = recommendation_history[-HISTORY_WINDOW:]
    if len(window) < 4:
        return False, ""

    counts = Counter(window)
    total = len(window)
    dominant_cat, dominant_count = counts.most_common(1)[0]
    freq = dominant_count / total

    if freq >= REPETITION_THRESHOLD:
        return True, (
            f"Filter bubble detected: '{dominant_cat}' appears in "
            f"{dominant_count}/{total} recent suggestions. Diversifying..."
        )
    return False, ""


def get_diversity_injection_note(history: List[str], top_result_category: str) -> str:
    """Generate a note to show the user when diversity was applied."""
    is_bubble, desc = detect_filter_bubble(history)
    if is_bubble:
        return f"🔀 {desc} We've added variety to your suggestions."
    return ""
