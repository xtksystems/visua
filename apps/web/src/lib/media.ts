/** Responsive helpers shared by pages: one place for the breakpoints the CSS uses. */
import { useEffect, useState, type CSSProperties } from "react";

/** Single-column layouts below this width (px): two-pane pages stack, master-detail pages show one pane. */
export const NARROW = "(max-width: 900px)";
/** Phones: touch screens smaller than 768px, where the Observatory opens on its 2D outline (DESIGN.md › Layout). */
export const PHONE = "(max-width: 767px) and (pointer: coarse)";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/** Two columns in the given proportions, stacking into one below 900px (`.split` in global.css). */
export function split(left: number, right: number): CSSProperties {
  return { ["--split" as string]: `minmax(0, ${left}fr) minmax(0, ${right}fr)` } as CSSProperties;
}
