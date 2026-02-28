"""
FAISS Vector Search Service
Embeds recommendation descriptions using sentence-transformers and indexes them.
Falls back to keyword matching if sentence-transformers are not available.
"""

import numpy as np
import os
import pickle
from typing import List, Tuple

# ── Try to import heavy dependencies ──────────────────────────────────────────
try:
    import faiss
    FAISS_AVAILABLE = True
except Exception:
    FAISS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    SBERT_AVAILABLE = True
except Exception:
    SBERT_AVAILABLE = False

INDEX_PATH = "data/faiss_index.bin"
META_PATH  = "data/faiss_meta.pkl"

_index: "faiss.IndexFlatL2 | None" = None
_metadata: List[dict] = []          # [{id, name, category, ...}]
_model = None


def _get_model():
    global _model
    if _model is None and SBERT_AVAILABLE:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _embed(texts: List[str]) -> np.ndarray:
    model = _get_model()
    if model:
        return model.encode(texts, normalize_embeddings=True).astype("float32")
    # Fallback: simple TF-like bag-of-chars embedding (dim=128)
    vecs = []
    for text in texts:
        vec = np.zeros(128, dtype="float32")
        for i, ch in enumerate(text.lower()[:128]):
            vec[i] += ord(ch) / 128.0
        norm = np.linalg.norm(vec)
        vecs.append(vec / norm if norm > 0 else vec)
    return np.array(vecs, dtype="float32")


def build_index(recommendations: List[dict]) -> None:
    """Build FAISS index from list of recommendation dicts."""
    global _index, _metadata
    _metadata = recommendations

    texts = [
        f"{r['name']} {r['description']} {r['category']} {r['sub_category']} {' '.join(r.get('tags', []))}"
        for r in recommendations
    ]
    embeddings = _embed(texts)
    dim = embeddings.shape[1]

    if FAISS_AVAILABLE:
        _index = faiss.IndexFlatIP(dim)   # Inner product (cosine after normalization)
        _index.add(embeddings)
        os.makedirs("data", exist_ok=True)
        faiss.write_index(_index, INDEX_PATH)
        with open(META_PATH, "wb") as f:
            pickle.dump(_metadata, f)
    else:
        # Store embeddings in memory for fallback search
        _index = embeddings
        os.makedirs("data", exist_ok=True)
        with open(META_PATH + ".npy", "wb") as f:
            np.save(f, embeddings)
        with open(META_PATH, "wb") as f:
            pickle.dump(_metadata, f)


def load_index() -> bool:
    """Load persisted index from disk. Returns True if successful."""
    global _index, _metadata
    if not os.path.exists(META_PATH):
        return False
    with open(META_PATH, "rb") as f:
        _metadata = pickle.load(f)
    if FAISS_AVAILABLE and os.path.exists(INDEX_PATH):
        _index = faiss.read_index(INDEX_PATH)
        return True
    npy_path = META_PATH + ".npy"
    if os.path.exists(npy_path):
        with open(npy_path, "rb") as f:
            _index = np.load(f)
        return True
    return False


def search(query: str, top_k: int = 10) -> List[Tuple[dict, float]]:
    """Return top_k (metadata, score) pairs for a query string."""
    global _index, _metadata
    if _index is None:
        load_index()
    if _index is None or not _metadata:
        return []

    q_vec = _embed([query])   # shape (1, dim)

    if FAISS_AVAILABLE and hasattr(_index, "search"):
        scores, indices = _index.search(q_vec, min(top_k, len(_metadata)))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0:
                results.append((_metadata[idx], float(score)))
        return results
    else:
        # Numpy fallback cosine similarity
        sims = (_index @ q_vec.T).flatten()
        top_indices = np.argsort(sims)[::-1][:top_k]
        return [(_metadata[i], float(sims[i])) for i in top_indices]


def get_all_metadata() -> List[dict]:
    return _metadata
