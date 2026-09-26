"""Shared helpers for the NIST AI RMF corpus extraction scripts.

All paths are resolved relative to the corpus folder (the parent of tools/),
so the scripts can be run from anywhere:  python3 tools/extract_core.py
"""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # corpus/nist-ai-rmf

LIGATURES = {
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl",
    "ﬅ": "st", "ﬆ": "st",
}


def fix_ligatures(s: str) -> str:
    """Replace typographic ligature code points (U+FB00-FB06) emitted by the PDF text layer
    with the letters they stand for. No other character is changed."""
    for k, v in LIGATURES.items():
        s = s.replace(k, v)
    return s


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest_doc(doc_id: str):
    """Return the manifest record for doc_id, or None if manifest.json is missing."""
    mp = ROOT / "manifest.json"
    if not mp.exists():
        return None
    for d in json.loads(mp.read_text(encoding="utf-8"))["documents"]:
        if d["id"] == doc_id:
            return d
    return None


def norm_cmp(s: str) -> str:
    """Aggressive normalisation used only for *comparing* texts from different sources
    (never for output): unify quotes/dashes/whitespace, drop soft hyphens and markdown."""
    s = fix_ligatures(s)
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("­", "")
    s = re.sub(r"\[URL\]\([^)]*\)", "", s)
    s = re.sub(r"\[([^\]]*)\]\(\)", r"\1", s)
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'),
                 ("–", "-"), ("—", "-"), ("‑", "-"), (" ", " ")):
        s = s.replace(a, b)
    s = re.sub(r"\s*-\s*", "-", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.lower()


WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’]*(?:-[A-Za-z][A-Za-z'’]*)*")


def vocabulary(texts):
    """Return (plain_words, hyphenated_words) seen in the given texts (lower-cased)."""
    plain, hyph = set(), set()
    for t in texts:
        for w in WORD_RE.findall(fix_ligatures(t)):
            w = w.lower()
            if "-" in w:
                hyph.add(w)
                plain.update(w.split("-"))
            else:
                plain.add(w)
    return plain, hyph


def join_lines(lines, plain_vocab, hyph_vocab, own_text="", log=None, ctx=""):
    """Join PDF text lines into one string, resolving end-of-line hyphens.

    A line ending in "<left>-" followed by a line starting with "<right>" is joined as
    "<left>-<right>" when that hyphenated form is known (own_text or hyph_vocab), and as
    "<left><right>" when the solid form is known; otherwise the hyphen is kept (a genuine
    hyphen is never silently dropped) and the case is logged for review.
    """
    own_plain, own_hyph = vocabulary([own_text]) if own_text else (set(), set())
    out = ""
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if not out:
            out = ln
            continue
        m = re.search(r"([A-Za-z]+)-$", out)
        n = re.match(r"([A-Za-z]+)", ln)
        if m and n and not out.endswith(" -"):
            left, right = m.group(1), n.group(1)
            solid = (left + right).lower()
            hyph = (left + "-" + right).lower()
            if hyph in own_hyph:
                decision = "keep"
            elif solid in own_plain:
                decision = "join"
            elif hyph in hyph_vocab and solid not in plain_vocab:
                decision = "keep"
            elif solid in plain_vocab:
                decision = "join"
            elif hyph in hyph_vocab:
                decision = "keep"
            else:
                decision = "keep?"
            if log is not None:
                log.append({"context": ctx, "left": left, "right": right, "decision": decision})
            if decision == "join":
                out = out[:-1] + ln
            else:
                out = out + ln
        else:
            out = out + " " + ln
    out = re.sub(r"[ \t]+", " ", out).strip()
    return out
