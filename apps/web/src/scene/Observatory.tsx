/**
 * The Observatory canvas: camera, light, fog, bloom and the framework space.
 * Camera: 45° FOV, damped orbit, fly-to on selection, never below the plane.
 */
import { CameraControls, PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FogExp2, Sphere, Vector3, type PerspectiveCamera } from "three";
import { TOKENS } from "./colors.ts";
import { FrameworkScene, heightFor, type SceneProps } from "./FrameworkScene.tsx";
import type { Layout } from "./layout.ts";
import { hudRects, outwardRect, rectsOverlap, safeRect, type Rect } from "./ScreenLabels.tsx";

/**
 * The home view: the camera looks down at ~43° from the front, as close as it can while
 * the ring and its sector titles stay inside the canvas and clear of every HUD panel,
 * with the ring centered in the free area (see safeRect).
 */
function homePose(layout: Layout, camera: PerspectiveCamera, width: number, height: number, safe: Rect, panels: Rect[]) {
  const cam = camera.clone();
  const dir = new Vector3(0, 1.42, 1.52).normalize();
  const R = layout.view === "constellation" && layout.sectors[0] ? layout.sectors[0].radius : layout.radius - 3;
  const top = heightFor(4, layout.view);
  const ring: Vector3[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ring.push(new Vector3(Math.cos(a) * R, 0, Math.sin(a) * R), new Vector3(Math.cos(a) * R, top, Math.sin(a) * R));
  }
  // Sector titles as ScreenLabels draws them: code, title (label-caps 13px), read-out.
  const titles = layout.sectors.map((s) => {
    const mid = (s.start + s.end) / 2;
    const r = layout.view === "constellation" ? s.radius + 1 : Math.hypot(s.labelPos[0], s.labelPos[2]);
    const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
    const text = titled ? s.title : s.code;
    // Width: the title in label-caps (~9.6px a character) or the read-out line beneath it (~150px).
    return { anchor: new Vector3(Math.cos(mid) * r, 0.3, Math.sin(mid) * r), w: Math.max(text.length * 9.6, 150) + 8, h: (titled ? 14 : 0) + 17 + 14 };
  });
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
    const panels = mode !== "titles";
    for (const p of ring) {
      const [x, y] = toScreen(p);
      const dot = { x, y, w: 0, h: 0 };
      if (!inside(dot) || (panels && blocked.some((b) => rectsOverlap(dot, b, 0)))) return false;
    }
    if (mode === "ring") return true;
    const [ox, oy] = toScreen(target);
    for (const t of titles) {
      const [px, py] = toScreen(t.anchor);
      const r = outwardRect(px, py, ox, oy, t.w, t.h);
      if (!inside(r) || (panels && blocked.some((b) => rectsOverlap(r, b, 0)))) return false;
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
  let tz = R * 0.08;
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

function CameraRig({ layout, selectedId, focusIds, focusSeq, reducedMotion }: { layout: Layout; selectedId: string | null; focusIds: string[]; focusSeq: number; reducedMotion: boolean }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const animate = !reducedMotion;
  const [safe, setSafe] = useState<Rect | null>(null);
  const safeRef = useRef<Rect | null>(null);
  const sinceCheck = useRef(0);
  // Whether the camera still shows the home view (a HUD change then re-frames it).
  const atHome = useRef(true);

  // The area no HUD panel covers, checked a few times a second (panels open, close and wrap).
  useFrame((_, dt) => {
    sinceCheck.current += dt;
    if (safeRef.current && sinceCheck.current < 0.2) return;
    sinceCheck.current = 0;
    const r = safeRect(gl.domElement, size.width, size.height);
    const p = safeRef.current;
    if (!p || Math.abs(p.x - r.x) > 2 || Math.abs(p.y - r.y) > 2 || Math.abs(p.w - r.w) > 2 || Math.abs(p.h - r.h) > 2) {
      safeRef.current = r;
      setSafe(r);
    }
  });

  // The camera target appears in the middle of that area, so nothing it looks at hides under a panel.
  useLayoutEffect(() => {
    if (!safe) return;
    const { width: W, height: H } = size;
    camera.setViewOffset(W, H, W / 2 - (safe.x + safe.w / 2), H / 2 - (safe.y + safe.h / 2), W, H);
    camera.updateProjectionMatrix();
  }, [safe, size, camera]);

  const home = (transition: boolean) => {
    if (!safe || !controls.current) return;
    const pose = homePose(layout, camera, size.width, size.height, safe, hudRects(gl.domElement));
    // Keep the fog's depth cue the same however far back the canvas needs the camera.
    if (scene.fog instanceof FogExp2) scene.fog.density = 0.55 / Math.max(40, pose.distance * 1.15);
    void controls.current.setLookAt(pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z, transition);
    atHome.current = true;
  };

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const away = () => {
      atHome.current = false;
    };
    c.addEventListener("controlstart", away);
    return () => c.removeEventListener("controlstart", away);
  }, []);

  useEffect(() => {
    atHome.current = true;
    home(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useEffect(() => {
    if (atHome.current && !selectedId) home(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe]);

  useEffect(() => {
    if (!selectedId) return;
    const p = layout.positions.get(selectedId);
    if (!p) return;
    atHome.current = false;
    const node = layout.byId.get(selectedId);
    const scale = layout.radius > 60 ? 1.8 : 1;
    const dist = (node?.assessable ? 17 : node?.depth === 0 ? 30 : 22) * scale;
    const len = Math.hypot(p[0], p[2]) || 1;
    const dx = p[0] / len;
    const dz = p[2] / len;
    const y = node?.assessable ? heightFor(2, layout.view) : 0.4;
    void controls.current?.setLookAt(p[0] + dx * dist * 0.65, dist * 0.8, p[2] + dz * dist * 0.65, p[0], y, p[2], animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, layout]);

  useEffect(() => {
    if (focusSeq === 0) return;
    const pts = focusIds.map((id) => layout.positions.get(id)).filter((p): p is [number, number, number] => !!p);
    if (!pts.length) return home(animate);
    if (pts.length === 1) return;
    atHome.current = false;
    const center = new Vector3(pts.reduce((s, p) => s + p[0], 0) / pts.length, 0, pts.reduce((s, p) => s + p[2], 0) / pts.length);
    const radius = Math.max(4, ...pts.map((p) => Math.hypot(p[0] - center.x, p[2] - center.z))) + 2;
    void controls.current?.fitToSphere(new Sphere(center, radius), animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={2.5}
      maxDistance={layout.radius * 8}
      maxPolarAngle={Math.PI * 0.46}
      smoothTime={animate ? 0.32 : 0.001}
      dollySpeed={0.7}
    />
  );
}

export interface ObservatoryProps extends Omit<SceneProps, "reducedMotion"> {
  focusSeq: number;
  agentActive: boolean;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function Observatory(props: ObservatoryProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [effects, setEffects] = useState(true);
  const fogDensity = useMemo(() => 0.55 / Math.max(40, props.layout.radius * 2.4), [props.layout.radius]);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.1, far: 4000, position: [0, 40, 60] }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="3D Observatory of the framework. Use the outline panel for keyboard navigation."
    >
      <color attach="background" args={[TOKENS.neutral]} />
      <fogExp2 attach="fog" args={[TOKENS.neutral, fogDensity]} />
      <hemisphereLight args={[TOKENS.primaryContainer, TOKENS.neutral, 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[30, 60, 20]} intensity={1.6} />
      <directionalLight position={[-40, 20, -30]} intensity={0.35} color={TOKENS.primary} />
      <Stars radius={props.layout.radius * 3} depth={props.layout.radius} count={1400} factor={2.2} saturation={0} fade speed={0} />
      <FrameworkScene {...props} reducedMotion={reducedMotion} />
      <CameraRig layout={props.layout} selectedId={props.selectedId} focusIds={props.focusIds} focusSeq={props.focusSeq} reducedMotion={reducedMotion} />
      <PerformanceMonitor onDecline={() => setEffects(false)} />
      {effects && (
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.2} intensity={0.9} mipmapBlur />
          <Vignette offset={0.28} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
