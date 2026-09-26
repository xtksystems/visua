"""Shared helpers for the AI threat catalog corpus scripts (corpus/ai-threats/tools).

All paths are resolved relative to the corpus folder (the parent of tools/), so the
scripts can be run from anywhere:  python3 tools/extract_atlas.py
"""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # corpus/ai-threats
CORPUS = ROOT.parent                                   # corpus/
RETRIEVED = "2026-09-26"

LIGATURES = {"ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st"}

OWASP_LICENSE = "CC BY-SA 4.0"
OWASP_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/legalcode"


def fix_ligatures(s: str) -> str:
    """Replace ligature code points (U+FB00-FB06) emitted by PDF text layers with plain letters."""
    for k, v in LIGATURES.items():
        s = s.replace(k, v)
    return s


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def manifest_doc(doc_id: str, manifest: Path = None):
    """Return the manifest record for doc_id from corpus/ai-threats/manifest.json (or another manifest)."""
    mp = manifest or (ROOT / "manifest.json")
    if not mp.exists():
        return None
    for d in json.loads(mp.read_text(encoding="utf-8"))["documents"]:
        if d["id"] == doc_id:
            return d
    return None


def nist_ai_rmf_doc(doc_id: str):
    return manifest_doc(doc_id, CORPUS / "nist-ai-rmf" / "manifest.json")


def write_json(path: Path, obj, check: bool = False) -> bool:
    """Write obj as UTF-8 JSON (2-space indent, trailing newline). With check=True only compare.
    Returns True when the file on disk already equals the new content."""
    text = json.dumps(obj, indent=2, ensure_ascii=False) + "\n"
    same = path.exists() and path.read_text(encoding="utf-8") == text
    if not check and not same:
        path.write_text(text, encoding="utf-8")
    return same


def norm_ws(s: str) -> str:
    """Collapse whitespace runs to single spaces and strip (used for PDF text reflow only)."""
    return re.sub(r"\s+", " ", s).strip()


def norm_cmp(s: str) -> str:
    """Aggressive normalisation used only for *comparing* texts (never for output)."""
    s = fix_ligatures(s)
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("­", "")
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'), ("–", "-"), ("—", "-"), ("‑", "-"), (" ", " ")):
        s = s.replace(a, b)
    s = re.sub(r"\s*-\s*", "-", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.lower()


def squash(s: str) -> str:
    """Remove everything but letters and digits (containment checks against PDF text layers)."""
    return re.sub(r"[^0-9a-z]", "", norm_cmp(s))
