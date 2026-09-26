"""Parser for the OWASP GenAI Security Crosswalk mapping files kept in owasp-genai-crosswalk/.

Each file maps the ten entries of one OWASP list (LLM Top 10 2026 or Agentic Top 10 2026) to one framework.
Per entry ('### LLM01 — Prompt Injection') the first markdown table after the '#### ... mapping' /
'#### MITRE ATLAS techniques' heading is the mapping table; its rows are returned as printed. The crosswalk's
data README states that these Markdown files are the authoritative source of its JSON data layer.
"""
import re
from collections import OrderedDict

from common import ROOT

BASE = ROOT / "owasp-genai-crosswalk"
FILES = OrderedDict([
    ("llm-top10/LLM_NISTCSF2.md", ("owasp-llm-top10", "nist-csf-2.0", "NIST CSF 2.0")),
    ("llm-top10/LLM_NISTAIRMF.md", ("owasp-llm-top10", "nist-ai-rmf", "NIST AI RMF 1.0")),
    ("llm-top10/LLM_MITREATLAS.md", ("owasp-llm-top10", "atlas", "MITRE ATLAS")),
    ("llm-top10/LLM_FedRAMP.md", ("owasp-llm-top10", "nist-sp-800-53-r5", "FedRAMP (SP 800-53 controls)")),
    ("agentic-top10/Agentic_NISTCSF2.md", ("owasp-agentic-top10", "nist-csf-2.0", "NIST CSF 2.0")),
    ("agentic-top10/Agentic_NISTAIRMF.md", ("owasp-agentic-top10", "nist-ai-rmf", "NIST AI RMF 1.0")),
    ("agentic-top10/Agentic_MITREATLAS.md", ("owasp-agentic-top10", "atlas", "MITRE ATLAS")),
    ("agentic-top10/Agentic_FedRAMP.md", ("owasp-agentic-top10", "nist-sp-800-53-r5", "FedRAMP (SP 800-53 controls)")),
])
ENTRY_RE = re.compile(r"^### ((?:LLM|ASI)\d\d)\s+[—–-]\s+(.+?)\s*$")
TABLE_HEAD_RE = re.compile(r"^#### (.*(?:mapping|techniques).*)$", re.I)


def _cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def parse_file(rel):
    lines = (BASE / rel).read_text(encoding="utf-8").splitlines()
    out, entry, want, header, table_title = [], None, False, None, None
    for n, line in enumerate(lines, 1):
        m = ENTRY_RE.match(line)
        if m:
            entry = dict(id=m.group(1), title=m.group(2), line=n)
            want, header = False, None
            continue
        if entry is None:
            continue
        h = TABLE_HEAD_RE.match(line)
        if h and not line.lower().startswith("#### mitigations"):
            want, header, table_title = True, None, h.group(1).strip()
            continue
        if line.startswith("#"):
            want = False
            continue
        if not want:
            continue
        if line.startswith("|"):
            cells = _cells(line)
            if header is None:
                header = cells
                continue
            if set("".join(cells)) <= set("-: "):
                continue
            row = OrderedDict(zip(header, cells))
            out.append(OrderedDict(entryId=entry["id"], entryTitle=entry["title"], table=table_title, row=row, line=n))
        elif header is not None and line.strip() == "":
            want = False
    return out


def atlas_id(cell):
    m = re.search(r"AML\.TA?\d{4}(?:\.\d{3})?", cell)
    return m.group(0) if m else None


def ai_rmf_id(cell):
    """'GV-1.7' / 'MS-2.5' -> 'GOVERN 1.7' / 'MEASURE 2.5' (the AI 600-1 abbreviation of AI RMF subcategories)."""
    m = re.match(r"^(GV|MP|MS|MG)-(\d+)\.(\d+)$", cell.strip())
    if not m:
        return None
    fn = {"GV": "GOVERN", "MP": "MAP", "MS": "MEASURE", "MG": "MANAGE"}[m.group(1)]
    return f"{fn} {int(m.group(2))}.{int(m.group(3))}"
