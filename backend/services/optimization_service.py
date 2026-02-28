"""
Multi-Constraint Optimization Engine
Scores recommendations using weighted criteria:
  - budget_fit       (30%)
  - preference_sim   (25%)
  - time_feasibility (20%)
  - proximity        (15%)
  - diversity_score  (10%)
"""

from typing import List, Dict, Any


# ── Weights (must sum to 1.0) ─────────────────────────────────────────────────
WEIGHTS = {
    "budget_fit":       0.30,
    "preference_sim":   0.25,
    "time_feasibility": 0.20,
    "proximity":        0.15,
    "diversity_score":  0.10,
}

# Simple location graph (campus distance approximation in minutes walk)
LOCATION_DISTANCE: Dict[str, Dict[str, float]] = {
    "Main Campus":   {"Main Campus": 0, "Library Block": 3, "Canteen": 5, "Sports Complex": 10, "Auditorium": 8, "Hostel": 12},
    "Library Block": {"Main Campus": 3, "Library Block": 0, "Canteen": 7, "Sports Complex": 12, "Auditorium": 6, "Hostel": 15},
    "Canteen":       {"Main Campus": 5, "Library Block": 7, "Canteen": 0, "Sports Complex": 8,  "Auditorium": 4, "Hostel": 10},
    "Sports Complex":{"Main Campus":10, "Library Block":12, "Canteen": 8, "Sports Complex": 0,  "Auditorium":14, "Hostel": 6},
    "Auditorium":    {"Main Campus": 8, "Library Block": 6, "Canteen": 4, "Sports Complex":14,  "Auditorium": 0, "Hostel": 14},
    "Hostel":        {"Main Campus":12, "Library Block":15, "Canteen":10, "Sports Complex": 6,  "Auditorium":14, "Hostel": 0},
}


def _budget_fit_score(cost: float, budget: float) -> float:
    """1.0 if free, drops linearly, 0.0 if cost >= budget."""
    if budget <= 0:
        return 0.0
    if cost <= 0:
        return 1.0
    ratio = cost / budget
    if ratio >= 1.0:
        return 0.0
    # Sweet spot: using 40-80% of budget scores highest
    if 0.4 <= ratio <= 0.8:
        return 1.0
    if ratio < 0.4:
        return 0.7 + ratio * 0.75   # cheaper is slightly less personalized
    return max(0.0, 1.0 - (ratio - 0.8) * 5)


def _preference_similarity(tags: List[str], user_prefs: List[str]) -> float:
    """Jaccard-like overlap between item tags and user preferences."""
    if not user_prefs or not tags:
        return 0.3   # neutral
    tags_lower = {t.lower() for t in tags}
    prefs_lower = {p.lower() for p in user_prefs}
    intersection = tags_lower & prefs_lower
    union = tags_lower | prefs_lower
    return len(intersection) / len(union) if union else 0.3


def _time_feasibility(
    duration_minutes: int,
    free_time_minutes: int,
    available_times: List[str],
    time_of_day: str,
) -> float:
    """Penalise if activity doesn't fit in available window."""
    if duration_minutes > free_time_minutes:
        return 0.0
    time_fit = 1.0 if time_of_day in available_times else 0.4
    # Remaining time bonus
    slack = (free_time_minutes - duration_minutes) / max(free_time_minutes, 1)
    return min(1.0, time_fit * (0.7 + 0.3 * (1 - slack)))


def _proximity_score(item_location: str, user_location: str) -> float:
    """Closer = higher score."""
    dist = (
        LOCATION_DISTANCE
        .get(user_location, {})
        .get(item_location, 20)
    )
    return max(0.0, 1.0 - dist / 20.0)


def score_recommendation(
    rec: dict,
    budget: float,
    free_time_minutes: int,
    user_preferences: List[str],
    user_location: str,
    time_of_day: str,
    diversity_score: float = 0.5,
    custom_weights: Dict[str, float] = None,
) -> Dict[str, Any]:
    """
    Compute weighted score for a recommendation.
    Accepts optional custom_weights from user behavioral profile.
    Returns {total_score, breakdown, explanation_data}.
    """
    w = dict(WEIGHTS)
    if custom_weights:
        w["budget_fit"]       = custom_weights.get("budget_weight",      w["budget_fit"])
        w["preference_sim"]   = custom_weights.get("preference_weight",  w["preference_sim"])
        w["time_feasibility"] = custom_weights.get("time_weight",        w["time_feasibility"])
        w["proximity"]        = custom_weights.get("proximity_weight",   w["proximity"])
        w["diversity_score"]  = custom_weights.get("diversity_weight",   w["diversity_score"])

    bf  = _budget_fit_score(rec["cost"], budget)
    ps  = _preference_similarity(rec.get("tags", []), user_preferences)
    tf  = _time_feasibility(
              rec.get("duration_minutes", 60),
              free_time_minutes,
              rec.get("available_times", ["afternoon"]),
              time_of_day,
          )
    prx = _proximity_score(rec.get("location", "Main Campus"), user_location)
    div = diversity_score

    total = (
        w["budget_fit"]       * bf  +
        w["preference_sim"]   * ps  +
        w["time_feasibility"] * tf  +
        w["proximity"]        * prx +
        w["diversity_score"]  * div
    )

    breakdown = {
        "Budget Fit":        round(bf  * w["budget_fit"]       * 100, 1),
        "Preference Match":  round(ps  * w["preference_sim"]   * 100, 1),
        "Time Feasibility":  round(tf  * w["time_feasibility"] * 100, 1),
        "Proximity":         round(prx * w["proximity"]        * 100, 1),
        "Diversity Bonus":   round(div * w["diversity_score"]  * 100, 1),
    }

    return {
        "total_score": round(total, 4),
        "breakdown": breakdown,
        "raw_scores": {"bf": bf, "ps": ps, "tf": tf, "prx": prx, "div": div},
    }


def rank_recommendations(
    candidates: List[dict],
    budget: float,
    free_time_minutes: int,
    user_preferences: List[str],
    user_location: str,
    time_of_day: str,
    diversity_scores: Dict[int, float],
    top_k: int = 5,
    custom_weights: Dict[str, float] = None,
) -> List[dict]:
    """
    Score, sort and return top_k recommendations with score metadata attached.
    Accepts optional custom_weights from user behavioral profile.
    """
    scored = []
    for rec in candidates:
        div = diversity_scores.get(rec["id"], 0.5)
        result = score_recommendation(
            rec, budget, free_time_minutes,
            user_preferences, user_location, time_of_day, div,
            custom_weights=custom_weights,
        )
        enriched = dict(rec)
        enriched["score"] = result["total_score"]
        enriched["score_breakdown"] = result["breakdown"]
        scored.append(enriched)

    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:top_k]
