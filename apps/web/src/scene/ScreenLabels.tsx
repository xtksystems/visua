/**
 * Screen-space labels for the 3D scenes (DESIGN.md › Spatial System): labels use
 * the type tokens at 11–14px on screen and never overlap — lower-priority labels
 * hide first. Each label follows a world anchor; whenever the camera moves, labels
 * are placed in priority order and hidden where they would overlap a placed label,
 * a HUD panel (elements marked `data-hud` inside the `data-stage` element) or the
 * edge of the canvas, so nothing is ever cut off or covered.
 *
 * The labels repeat what the outline and inspector say, so they are hidden from
 * assistive technology. They are plain DOM managed here (the canvas's React
 * renderer cannot portal into the page), with text set through textContent.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import type { Vec3 } from "./layout.ts";

export interface ScreenLabel {
  id: string;
  /** World anchor: the label sits just above it, or outside `outwardFrom`. */
  position: Vec3;
  title: string;
  /** A small monospace line above the title (a group's code). */
  code?: string;
  /** A small line below the title (a read-out). */
  sub?: string;
  variant: "sector" | "code" | "selected";
  /** Higher places first; a lower-priority label hides when it would overlap. */
  priority: number;
  /** Place the label on the far side of its anchor from this point (sector titles stay outside their ring). */
  outwardFrom?: Vec3;
  /** A swatch before the title, as a CSS color from the design tokens. */
  swatch?: string;
  /** Alternatives share a group: the first of them that fits, by priority, is shown and the others stay hidden. */
  group?: string;
  active?: boolean;
  dim?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Rect, b: Rect, pad: number) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * Panels over a canvas, in canvas pixels: the HUD (`data-hud` inside the `data-stage`
 * element) and, on smaller screens, the outline and the inspector's bottom sheet
 * (`data-hud` anywhere inside the page's `data-stage-root`). Only the part over the
 * canvas counts: panels beside it are ignored.
 */
export function hudRects(canvas: HTMLCanvasElement): Rect[] {
  const root = canvas.closest("[data-stage-root]") ?? canvas.closest("[data-stage]");
  if (!root) return [];
  const c = canvas.getBoundingClientRect();
  const out: Rect[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-hud]")) {
    const r = el.getBoundingClientRect();
    const x0 = Math.max(r.left, c.left);
    const y0 = Math.max(r.top, c.top);
    const x1 = Math.min(r.right, c.right);
    const y1 = Math.min(r.bottom, c.bottom);
    if (x1 - x0 > 1 && y1 - y0 > 1) out.push({ x: x0 - c.left, y: y0 - c.top, w: x1 - x0, h: y1 - y0 });
  }
  return out;
}

/**
 * Where the camera target should appear: the middle of the canvas minus the HUD bands
 * that cross its center line (the top bar; a bottom panel as wide as the canvas) and
 * any tall side panel. Corner panels leave the ring room beside them, so they are left
 * to the framing test instead. Falls back to the whole canvas when too little is left.
 */
export function safeRect(canvas: HTMLCanvasElement, width: number, height: number, gap = 12): Rect {
  let top = gap;
  let bottom = height - gap;
  let left = gap;
  let right = width - gap;
  for (const r of hudRects(canvas)) {
    if (r.h > height * 0.6) {
      if (r.x + r.w / 2 < width / 2) left = Math.max(left, r.x + r.w + gap);
      else right = Math.min(right, r.x - gap);
      continue;
    }
    const crossesCenter = r.x < width / 2 + 40 && r.x + r.w > width / 2 - 40;
    if (!crossesCenter) continue;
    if (r.y + r.h / 2 < height / 2) top = Math.max(top, r.y + r.h + gap);
    else bottom = Math.min(bottom, r.y - gap);
  }
  if (bottom - top < height * 0.35) {
    top = Math.min(top, height * 0.3);
    bottom = height - gap;
  }
  if (right - left < width * 0.4) {
    left = gap;
    right = width - gap;
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Where a label goes relative to its anchor when it is kept outside `outwardFrom` (screen pixels). */
export function outwardRect(px: number, py: number, ox: number, oy: number, w: number, h: number): Rect & { side: string } {
  const angle = (Math.atan2(py - oy, px - ox) * 180) / Math.PI;
  if (angle > -50 && angle < 50) return { x: px + 6, y: py - h / 2, w, h, side: "right" };
  if (angle > 130 || angle < -130) return { x: px - w - 6, y: py - h / 2, w, h, side: "left" };
  if (angle >= 50) return { x: px - w / 2, y: py + 6, w, h, side: "center" };
  return { x: px - w / 2, y: py - h - 6, w, h, side: "center" };
}

export const rectsOverlap = overlaps;

function span(className: string, text: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = className;
  s.textContent = text;
  return s;
}

export function ScreenLabels({ labels, margin = 6 }: { labels: ScreenLabel[]; margin?: number }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const [host] = useState(() => {
    const d = document.createElement("div");
    d.className = "scene-labels";
    d.setAttribute("aria-hidden", "true");
    return d;
  });
  const els = useRef(new Map<string, HTMLDivElement>());
  const sizes = useRef(new Map<string, { w: number; h: number }>());
  const dirty = useRef(true);
  const last = useRef<number[]>([]);
  const frame = useRef(0);
  const sorted = useMemo(() => [...labels].sort((a, b) => b.priority - a.priority), [labels]);
  const p = useMemo(() => new Vector3(), []);
  const o = useMemo(() => new Vector3(), []);

  useLayoutEffect(() => {
    gl.domElement.parentElement?.appendChild(host);
    return () => host.remove();
  }, [gl, host]);

  const measure = () => {
    for (const [id, el] of els.current) sizes.current.set(id, { w: el.offsetWidth, h: el.offsetHeight });
    dirty.current = true;
  };

  useLayoutEffect(() => {
    const keep = new Set<string>();
    for (const l of labels) {
      keep.add(l.id);
      let el = els.current.get(l.id);
      if (!el) {
        el = document.createElement("div");
        el.style.visibility = "hidden";
        host.appendChild(el);
        els.current.set(l.id, el);
      }
      const cls = `scene-label scene-label--${l.variant}${l.active ? " is-active" : ""}${l.dim ? " is-dim" : ""}${l.onClick ? " is-clickable" : ""}`;
      if (el.className !== cls) el.className = cls;
      const sig = `${l.code ?? ""}\u0000${l.title}\u0000${l.sub ?? ""}\u0000${l.swatch ?? ""}`;
      if (el.dataset["sig"] !== sig) {
        el.dataset["sig"] = sig;
        el.replaceChildren();
        if (l.code) el.appendChild(span("scene-label__code", l.code));
        const title = span("scene-label__title", "");
        if (l.swatch) {
          const sw = span("scene-label__swatch", "");
          sw.style.background = l.swatch;
          title.appendChild(sw);
        }
        title.appendChild(document.createTextNode(l.title));
        el.appendChild(title);
        if (l.sub) el.appendChild(span("scene-label__sub", l.sub));
      }
      const onClick = l.onClick;
      const onHover = l.onHover;
      el.onclick = onClick
        ? (e) => {
            e.stopPropagation();
            onClick();
          }
        : null;
      el.onpointerenter = onHover ? () => onHover(true) : null;
      el.onpointerleave = onHover ? () => onHover(false) : null;
    }
    for (const [id, el] of els.current) {
      if (keep.has(id)) continue;
      el.remove();
      els.current.delete(id);
      sizes.current.delete(id);
    }
    measure();
  }, [labels, host]);

  // Web fonts change label widths once they load.
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
    };
  }, []);

  useFrame(() => {
    frame.current++;
    const state = [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements, size.width, size.height];
    const moved = state.some((x, i) => x !== last.current[i]);
    // HUD panels can change without the camera moving: look again every 20 frames.
    if (!moved && !dirty.current && frame.current % 20 !== 0) return;
    last.current = state;
    dirty.current = false;
    const W = size.width;
    const H = size.height;
    const blocked = hudRects(gl.domElement);
    const placed: Rect[] = [];
    const shown = new Set<string>();
    for (const l of sorted) {
      const el = els.current.get(l.id);
      const s = sizes.current.get(l.id);
      if (!el) continue;
      let rect: Rect | null = null;
      p.set(l.position[0], l.position[1], l.position[2]).project(camera);
      if (s && s.w > 0 && p.z > -1 && p.z < 1 && !(l.group && shown.has(l.group))) {
        const px = ((p.x + 1) / 2) * W;
        const py = ((1 - p.y) / 2) * H;
        let x = px - s.w / 2;
        let y = py - s.h - 4;
        let side = "center";
        if (l.outwardFrom) {
          o.set(l.outwardFrom[0], l.outwardFrom[1], l.outwardFrom[2]).project(camera);
          ({ x, y, side } = outwardRect(px, py, ((o.x + 1) / 2) * W, ((1 - o.y) / 2) * H, s.w, s.h));
        }
        if (el.dataset["side"] !== side) el.dataset["side"] = side;
        rect = { x, y, w: s.w, h: s.h };
        const inside = x >= margin && y >= margin && x + s.w <= W - margin && y + s.h <= H - margin;
        if (!inside || blocked.some((b) => overlaps(rect!, b, 4)) || placed.some((q) => overlaps(rect!, q, 3))) rect = null;
      }
      if (rect) {
        placed.push(rect);
        if (l.group) shown.add(l.group);
        el.style.transform = `translate3d(${Math.round(rect.x)}px, ${Math.round(rect.y)}px, 0)`;
        el.style.visibility = "visible";
      } else el.style.visibility = "hidden";
    }
  });
  return null;
}
