# Third-party data in this folder

Most files here are derived from U.S. Government works (NIST) and from state legislative
and regulatory records, which are not subject to copyright. Files derived from openly
licensed catalogs keep those licenses:

| Files | Source | License |
|---|---|---|
| `mitre-atlas.json`, `threat-mappings/threat--mitre-atlas-*.json`, the ATLAS entries in `chunks/ai-threats.json` | MITRE ATLAS™ data, release 2026.09. © 2021–2026 The MITRE Corporation. | [Apache License 2.0](../../../corpus/ai-threats/licenses/Apache-2.0.txt) ([MITRE's LICENSE](../../../corpus/ai-threats/mitre-atlas/LICENSE)). Modified by Visua: restructured into a framework graph and mapping sets; text unchanged. MITRE ATLAS is a trademark of The MITRE Corporation, used here only to identify the source. |
| `owasp-llm-top10.json`, `owasp-agentic-top10.json`, `threat-mappings/threat--owasp-*.json`, the OWASP entries in `chunks/ai-threats.json` | OWASP Top 10 for LLM Applications 2026 and 2025, OWASP Top 10 for Agentic Applications 2026, and the OWASP GenAI Security Crosswalk — OWASP GenAI Security Project (https://genai.owasp.org). | [CC BY-SA 4.0](../../../corpus/ai-threats/licenses/CC-BY-SA-4.0-legalcode.txt). Adapted by Visua: descriptions, prevention strategies and mappings extracted from the published PDFs and crosswalk files and restructured; wording unchanged. **These files are licensed under CC BY-SA 4.0.** |

Material that may not be redistributed (AICPA criteria and mappings, MITRE SAFE-AI) is
never committed: see `corpus/README.md` and `.gitignore`.
