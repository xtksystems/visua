/**
 * The Observatory canvas: camera, light, fog, bloom and the framework space.
 * Camera: 45° FOV, damped orbit, fly-to on selection, never below the plane.
 */
import { CameraControls, PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sphere, Vector3 } from "three";
import { TOKENS } from "./colors.ts";
import { FrameworkScene, heightFor, type SceneProps } from "./FrameworkScene.tsx";
import type { Layout } from "./layout.ts";

function CameraRig({ layout, selectedId, focusIds, focusSeq, reducedMotion }: { layout: Layout; selectedId: string | null; focusIds: string[]; focusSeq: number; reducedMotion: boolean }) {
  const controls = useRef<CameraControls>(null);
  const animate = !reducedMotion;

  const home = () => {
    const r = layout.radius;
    void controls.current?.setLookAt(0, r * 1.42, r * 1.52, 0, 0, r * 0.08, animate);
  };

  useEffect(() => {
    const r = layout.radius;
    void controls.current?.setLookAt(0, r * 1.42, r * 1.52, 0, 0, r * 0.08, false);
  }, [layout]);

  useEffect(() => {
    if (!selectedId) return;
    const p = layout.positions.get(selectedId);
    if (!p) return;
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
    if (!pts.length) return home();
    if (pts.length === 1) return;
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
      maxDistance={layout.radius * 3.2}
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
