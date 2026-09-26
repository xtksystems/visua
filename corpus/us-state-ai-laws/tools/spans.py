"""Extract verbatim passages from cleaned page text by start/end anchors.

The flat text is built line by line.  A line that ends in a hyphen is joined to the
next line without a space; in NY LBD bills (which hyphenate words at line ends) the
hyphen is dropped when the next line starts with a lower-case letter.  Every such
join inside an extracted passage is reported so it can be reviewed by hand, and
per-obligation `fix` pairs correct the rare wrong decision (e.g. a suspended hyphen
such as "SPAM- AND").
"""
import re

from pagetext import key, page_texts

DASHES = set("-‐‑‒–—―−­")


class Flat:
    def __init__(self, pages, dehyphenate=False):
        chars, pagemap, joins = [], [], []
        prev_space = True
        for pno, text in enumerate(pages, start=1):
            lines = [l.rstrip() for l in text.split("\n")]
            for i, line in enumerate(lines):
                s = line.strip()
                if not s:
                    continue
                s = re.sub(r"\s+", " ", s)
                for ch in s:
                    chars.append(ch)
                    pagemap.append(pno)
                # decide how this line joins the next
                if s.endswith("-") and not s.endswith("--") and len(s) > 1 and s[-2].isalpha():
                    joins.append(len(chars) - 1)  # index of the hyphen
                    continue  # no space: next line continues the word
                chars.append(" ")
                pagemap.append(pno)
        self.chars = chars
        self.pagemap = pagemap
        self.join_idx = set(joins)
        self.dehyphenate = dehyphenate
        # resolve NY-style dehyphenation
        drop = set()
        if dehyphenate:
            for j in joins:
                nxt = chars[j + 1] if j + 1 < len(chars) else ""
                if nxt.islower():
                    drop.add(j)
        self.drop = drop
        self.text = "".join(c for n, c in enumerate(chars) if n not in drop)
        self.tpage = [p for n, p in enumerate(pagemap) if n not in drop]
        # map text index -> original char index (for join reporting)
        self.orig = [n for n in range(len(chars)) if n not in drop]
        # key string with back-mapping
        kchars, kmap = [], []
        for n, c in enumerate(self.text):
            kc = key(c)
            for x in kc:
                kchars.append(x)
                kmap.append(n)
        self.k = "".join(kchars)
        self.kmap = kmap

    def extract(self, start, end, after=None, occurrence=1):
        ks, ke = key(start), key(end)
        pos = 0
        if after:
            ka = key(after)
            a = self.k.find(ka)
            if a < 0:
                raise ValueError(f"after-anchor not found: {after[:60]}")
            pos = a
        i = -1
        for _ in range(occurrence):
            i = self.k.find(ks, pos)
            if i < 0:
                raise ValueError(f"start anchor not found: {start[:70]}")
            pos = i + 1
        j = self.k.find(ke, i)
        if j < 0:
            raise ValueError(f"end anchor not found after start: {end[:70]}")
        t0 = self.kmap[i]
        t1 = self.kmap[j + len(ke) - 1] + 1
        # extend t1 over trailing characters that key() dropped (e.g., closing quote kept)
        text = self.text[t0:t1].strip()
        pages = self.tpage[t0:t1]
        # report joins inside the span
        reports = []
        o0, o1 = self.orig[t0], self.orig[t1 - 1]
        for jn in sorted(self.join_idx):
            if o0 <= jn <= o1:
                left = "".join(self.chars[max(0, jn - 18):jn + 1])
                right = "".join(self.chars[jn + 1:jn + 16])
                mode = "dropped-hyphen" if jn in self.drop else "kept-hyphen"
                reports.append(f"{mode}: …{left}|{right}…")
        return text, min(pages), max(pages), reports


_cache = {}


def flat_for(path, mode, family, dehyphenate):
    k = (path, mode, family, dehyphenate)
    if k not in _cache:
        _cache[k] = Flat(page_texts(path, mode, family), dehyphenate=dehyphenate)
    return _cache[k]
