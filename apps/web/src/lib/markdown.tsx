/**
 * Minimal, safe Markdown → React renderer (no HTML injection): headings,
 * paragraphs, lists, tables, blockquotes, bold, italic, inline code, links.
 * Enough for agent summaries, policies and reports.
 */
import { Fragment, type ReactNode } from "react";

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const k = `${key}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={k}>{inline(token.slice(2, -2), i)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={k}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)!;
      const href = mm[2]!;
      const safe = /^(https?:|\/|#)/.test(href) ? href : "#";
      out.push(
        <a key={k} href={safe} target={safe.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          {mm[1]}
        </a>,
      );
    } else out.push(<em key={k}>{inline(token.slice(1, -1), i)}</em>);
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const content = inline(heading[2]!, key);
      blocks.push(level === 1 ? <h1 key={key++}>{content}</h1> : level === 2 ? <h2 key={key++}>{content}</h2> : <h3 key={key++}>{content}</h3>);
      i++;
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1]!)) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i]!)) rows.push(splitRow(lines[i++]!));
      blocks.push(
        <div key={key++} style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>{head.map((h, hi) => <th key={hi}>{inline(h, hi)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, ci)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) quote.push(lines[i++]!.replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key++}>{quote.map((q, qi) => <Fragment key={qi}>{inline(q, qi)}{qi < quote.length - 1 ? <br /> : null}</Fragment>)}</blockquote>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-*]\s+/, ""));
      blocks.push(<ul key={key++}>{items.map((it, ii) => <li key={ii}>{inline(it, ii)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={key++}>{items.map((it, ii) => <li key={ii}>{inline(it, ii)}</li>)}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i]!)) para.push(lines[i++]!);
    if (!para.length) para.push(lines[i++]!);
    blocks.push(<p key={key++}>{inline(para.join(" "), key)}</p>);
  }
  return <div className={`markdown ${className ?? ""}`}>{blocks}</div>;
}
