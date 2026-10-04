/**
 * The Observatory canvas: camera, soft daylight, fog and the framework space.
 * Camera: 45° FOV, damped orbit, fly-to on selection, never below the plane.
 */
import { CameraControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { FogExp2, Sphere, Vector3, type PerspectiveCamera } from "three";
import { DemandCameraControls } from "./demandRendering.ts";
import { TOKENS } from "./colors.ts";
import { FrameworkScene, heightFor, type SceneProps } from "./FrameworkScene.tsx";
import type { Layout } from "./layout.ts";
import { fitRing, titleSize, useSafeArea } from "./framing.ts";
import { hudRects, type Rect } from "./ScreenLabels.tsx";

/** The Observatory's home view: its ring and sector titles, seen from the front at ~43°. */
function homePose(layout: Layout, camera: PerspectiveCamera, width: number, height: number, safe: Rect, panels: Rect[]) {
  const R = layout.view === "constellation" && layout.sectors[0] ? layout.sectors[0].radius : layout.radius - 3;
  const titles = layout.sectors.map((s) => {
    const mid = (s.start + s.end) / 2;
    const r = layout.view === "constellation" ? s.radius + 1 : Math.hypot(s.labelPos[0], s.labelPos[2]);
    const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
    return { anchor: new Vector3(Math.cos(mid) * r, 0.3, Math.sin(mid) * r), ...titleSize(titled ? s.title : s.code, { code: titled }) };
  });
  return fitRing({ camera, width, height, safe, panels, radius: R, top: heightFor(4, layout.view), titles, dir: new Vector3(0, 1.42, 1.52) });
}

function CameraRig({ layout, selectedId, focusIds, focusSeq, reducedMotion }: { layout: Layout; selectedId: string | null; focusIds: string[]; focusSeq: number; reducedMotion: boolean }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const animate = !reducedMotion;
  const safe = useSafeArea();
  // Whether the camera still shows the home view (a HUD change then re-frames it).
  const atHome = useRef(true);

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

  const frameNode = (id: string) => {
    const p = layout.positions.get(id);
    if (!p) return;
    atHome.current = false;
    const node = layout.byId.get(id);
    const scale = layout.radius > 60 ? 1.8 : 1;
    const dist = (node?.assessable ? 17 : node?.depth === 0 ? 30 : 22) * scale;
    const len = Math.hypot(p[0], p[2]) || 1;
    const dx = p[0] / len;
    const dz = p[2] / len;
    const y = node?.assessable ? heightFor(2, layout.view) : 0.4;
    void controls.current?.setLookAt(p[0] + dx * dist * 0.65, dist * 0.8, p[2] + dz * dist * 0.65, p[0], y, p[2], animate);
  };

  useEffect(() => {
    if (selectedId) frameNode(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, layout]);

  useEffect(() => {
    if (focusSeq === 0) return;
    const pts = focusIds.map((id) => layout.positions.get(id)).filter((p): p is [number, number, number] => !!p);
    if (!pts.length) {
      if (!selectedId) home(animate);
      return;
    }
    if (pts.length === 1) {
      const id = focusIds.find((id) => layout.positions.has(id))!;
      // A remounted canvas must not replay an older request over a newer selection.
      if (id === selectedId) frameNode(id);
      return;
    }
    atHome.current = false;
    const center = new Vector3(pts.reduce((s, p) => s + p[0], 0) / pts.length, 0, pts.reduce((s, p) => s + p[2], 0) / pts.length);
    const radius = Math.max(4, ...pts.map((p) => Math.hypot(p[0] - center.x, p[2] - center.z))) + 2;
    void controls.current?.fitToSphere(new Sphere(center, radius), animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  return (
    <CameraControls
      ref={controls}
      impl={DemandCameraControls}
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
  const fogDensity = useMemo(() => 0.55 / Math.max(40, props.layout.radius * 2.4), [props.layout.radius]);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.1, far: 4000, position: [0, 40, 60] }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="3D Observatory of the framework. Use the outline panel for keyboard navigation."
    >
      <color attach="background" args={[TOKENS.neutral]} />
      <fogExp2 attach="fog" args={[TOKENS.neutral, fogDensity]} />
      <hemisphereLight args={[TOKENS.surface, TOKENS.primaryContainer, 0.85]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[30, 60, 20]} intensity={2.1} />
      <directionalLight position={[-40, 20, -30]} intensity={0.45} color={TOKENS.neutral} />
      <FrameworkScene {...props} reducedMotion={reducedMotion} />
      <CameraRig layout={props.layout} selectedId={props.selectedId} focusIds={props.focusIds} focusSeq={props.focusSeq} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
