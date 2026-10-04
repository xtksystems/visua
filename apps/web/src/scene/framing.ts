/**
 * Framing a ring-shaped scene around the HUD (Observatory and Crosswalk Nexus).
 *
 * - `useSafeArea` tracks the part of the canvas no HUD band covers and offsets the
 *   camera's projection so whatever the camera looks at appears in its middle: the
 *   scene re-frames when the inspector opens or a bottom sheet covers the canvas.
 * - `fitRing` finds the home view: seen from a fixed direction, as close as it can be
 *   while the ring and its titles stay inside the canvas and clear of every panel.
 */
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState } from "react";
import { Vector3, type PerspectiveCamera } from "three";
import { observeSceneLayout } from "./demandRendering.ts";
import { outwardRect, rectsOverlap, safeRect, type Rect } from "./ScreenLabels.tsx";

export interface RingTitle {
  /** World anchor of the title (its label sits outside the ring from here). */
  anchor: Vector3;
  /** Estimated size on screen, in pixels. */
  w: number;
  h: number;
}

/** Size of a title as ScreenLabels draws it: an optional code line, the label-caps title (~9.6px a character), a read-out line. */
export function titleSize(title: string, opts: { code?: boolean; sub?: number; swatch?: boolean } = {}) {
  return { w: Math.max(title.length * 9.6 + (opts.swatch ? 14 : 0), opts.sub ?? 150) + 8, h: (opts.code ? 14 : 0) + 17 + 14 };
}

export function useSafeArea(): Rect | null {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const [safe, setSafe] = useState<Rect | null>(null);
  const last = useRef<Rect | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => observeSceneLayout(gl.domElement, () => {
    const r = safeRect(gl.domElement, size.width, size.height);
    const p = last.current;
    if (!p || Math.abs(p.x - r.x) > 2 || Math.abs(p.y - r.y) > 2 || Math.abs(p.w - r.w) > 2 || Math.abs(p.h - r.h) > 2) {
      last.current = r;
      setSafe(r);
    }
  }), [gl, size.width, size.height]);
  useLayoutEffect(() => {
    if (!safe) return;
    const { width: W, height: H } = size;
    camera.setViewOffset(W, H, W / 2 - (safe.x + safe.w / 2), H / 2 - (safe.y + safe.h / 2), W, H);
    camera.updateProjectionMatrix();
    invalidate();
  }, [safe, size, camera, invalidate]);
  return safe;
}

export function fitRing({
  camera,
  width,
  height,
  safe,
  panels,
  radius: R,
  top,
  titles,
  dir: direction,
  center = 0.08,
}: {
  camera: PerspectiveCamera;
  width: number;
  height: number;
  safe: Rect;
  panels: Rect[];
  radius: number;
  top: number;
  titles: RingTitle[];
  dir: Vector3;
  /** Where along z the camera first looks, as a share of the radius (then adjusted to center the ring). */
  center?: number;
}) {
  const cam = camera.clone();
  const dir = direction.clone().normalize();
  const ring: Vector3[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ring.push(new Vector3(Math.cos(a) * R, 0, Math.sin(a) * R), new Vector3(Math.cos(a) * R, top, Math.sin(a) * R));
  }
  const blocked = panels.map((b) => ({ x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 }));
  const inside = (r: Rect) => r.x >= 8 && r.y >= 8 && r.x + r.w <= width - 8 && r.y + r.h <= height - 8;
  const v = new Vector3();
  const target = new Vector3();
  const toScreen = (p: Vector3) => {
    v.copy(p).project(cam);
    return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height] as const;
  };
  const place = (d: number, tz: number) => {
    target.set(0, 0, tz);
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  };
  // "all": ring and titles clear of the panels; "titles": ring and titles inside the canvas;
  // "ring": the ring alone clear of the panels (a phone has no room for titles at the sides).
  type Mode = "all" | "titles" | "ring";
  const fits = (d: number, tz: number, mode: Mode) => {
    place(d, tz);
    const avoid = mode !== "titles";
    for (const p of ring) {
      const [x, y] = toScreen(p);
      const dot = { x, y, w: 0, h: 0 };
      if (!inside(dot) || (avoid && blocked.some((b) => rectsOverlap(dot, b, 0)))) return false;
    }
    if (mode === "ring") return true;
    const [ox, oy] = toScreen(target);
    for (const t of titles) {
      const [px, py] = toScreen(t.anchor);
      const r = outwardRect(px, py, ox, oy, t.w, t.h);
      if (!inside(r) || (avoid && blocked.some((b) => rectsOverlap(r, b, 0)))) return false;
    }
    return true;
  };
  const verticalCenter = (d: number, tz: number) => {
    place(d, tz);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of ring) {
      const [, y] = toScreen(p);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return (minY + maxY) / 2;
  };
  const search = (tz: number, mode: Mode) => {
    let lo = R * 0.4;
    let hi = R * 14;
    if (!fits(hi, tz, mode)) return null;
    for (let k = 0; k < 26; k++) {
      const mid = (lo + hi) / 2;
      if (fits(mid, tz, mode)) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const closest = (tz: number) => search(tz, "all") ?? search(tz, "titles") ?? search(tz, "ring");
  let tz = R * center;
  let d = R * 2.1;
  for (let iter = 0; iter < 4; iter++) {
    d = closest(tz) ?? R * 2.4;
    // Perspective draws the near side larger: slide the target until the ring sits in the middle of the free area.
    const cy = verticalCenter(d, tz);
    const off = cy - (safe.y + safe.h / 2);
    if (Math.abs(off) < 2) break;
    const slope = (verticalCenter(d, tz + R * 0.05) - cy) / (R * 0.05);
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-6) break;
    tz -= off / slope;
  }
  // A corner panel can hold the ring back on one side only: nudging it off-center may let it grow.
  let best = { d, tz };
  for (let k = -5; k <= 5; k++) {
    if (k === 0) continue;
    const t = tz + k * R * 0.06;
    const dk = closest(t);
    if (dk !== null && dk < best.d * 0.97) best = { d: dk, tz: t };
  }
  target.set(0, 0, best.tz);
  return { position: target.clone().addScaledVector(dir, best.d), target: target.clone(), distance: best.d };
}
