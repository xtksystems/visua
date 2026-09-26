"""Shared helpers for the law data modules."""


class Q:
    """A verbatim quotation located by start/end anchors in a registered document."""

    def __init__(self, doc, start, end, after=None, occ=1, prefix="", suffix="", fix=()):
        self.doc, self.start, self.end, self.after, self.occ = doc, start, end, after, occ
        self.prefix, self.suffix, self.fix = prefix, suffix, list(fix)

    def __repr__(self):
        return f"Q({self.doc!r}, {self.start[:30]!r}…)"
