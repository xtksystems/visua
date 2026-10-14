import { CameraControlsImpl } from "@react-three/drei";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemandCameraControls, observeSceneLayout } from "../src/scene/demandRendering.ts";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("demand camera flights", () => {
  it("does not consume idle time as animation time when a flight starts", () => {
    vi.stubGlobal("DOMRect", class { x = 0; y = 0; width = 0; height = 0; });
    CameraControlsImpl.install({ THREE });
    const camera = new THREE.PerspectiveCamera();
    const controls = new DemandCameraControls(camera);
    void controls.setLookAt(0, 0, 10, 0, 0, 0, false);
    controls.update(1 / 60);
    controls.update(1 / 60); // The final demand frame observes the camera asleep.
    void controls.setLookAt(10, 0, 10, 0, 0, 0, true);
    controls.update(90);
    expect(camera.position.x).toBeGreaterThan(0);
    expect(camera.position.x).toBeLessThan(5);
    for (let frame = 0; frame < 300; frame++) controls.update(1 / 60);
    expect(camera.position.x).toBeCloseTo(10, 2);
    expect(camera.position.z).toBeCloseTo(10, 2);
    controls.dispose();
  });
  it("uses elapsed animation time on a slow GPU after the initial wake frame", () => {
    vi.stubGlobal("DOMRect", class { x = 0; y = 0; width = 0; height = 0; });
    CameraControlsImpl.install({ THREE });
    const camera = new THREE.PerspectiveCamera();
    const controls = new DemandCameraControls(camera);
    void controls.setLookAt(0, 0, 10, 0, 0, 0, false);
    controls.update(1 / 60);
    controls.update(1 / 60);
    void controls.setLookAt(10, 0, 10, 0, 0, 0, true);
    controls.update(90);
    for (let frame = 0; frame < 4; frame++) controls.update(0.25);
    expect(camera.position.x).toBeCloseTo(10, 1);
    expect(camera.position.z).toBeCloseTo(10, 1);
    controls.dispose();
  });
});

/** Minimal DOM tree: exercise real observer scheduling without WebGL. */
class ElementStub {
  nodeType = 1;
  children: ElementStub[] = [];
  parent: ElementStub | null = null;
  listeners = new Map<string, EventListener>();
  readonly kind: string;
  constructor(kind: string) { this.kind = kind; }
  append(child: ElementStub) { child.parent = this; this.children.push(child); return child; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = null; }
  matches(selector: string): boolean { return selector === `[data-${this.kind}]` || (this.kind === "labels" && selector === ".scene-labels"); }
  closest(selector: string): ElementStub | null { return this.matches(selector) ? this : this.parent?.closest(selector) ?? null; }
  contains(node: ElementStub): boolean { return this === node || this.children.some((child) => child.contains(node)); }
  querySelectorAll(selector: string): ElementStub[] { return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
  addEventListener(name: string, listener: EventListener) { this.listeners.set(name, listener); }
  removeEventListener(name: string) { this.listeners.delete(name); }
}

function environment() {
  const root = new ElementStub("stage-root");
  const canvas = root.append(new ElementStub("canvas"));
  let mutations!: MutationCallback;
  let resized!: ResizeObserverCallback;
  const observed = new Set<object>();
  const disconnect = vi.fn();
  vi.stubGlobal("MutationObserver", class {
    constructor(callback: MutationCallback) { mutations = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resized = callback; }
    observe(target: object) { observed.add(target); }
    unobserve(target: object) { observed.delete(target); }
    disconnect = disconnect;
  });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  const mutate = (target: ElementStub, type = "attributes", addedNodes: ElementStub[] = [], removedNodes: ElementStub[] = []) => mutations([
    { target, type, addedNodes, removedNodes } as unknown as MutationRecord,
  ], {} as MutationObserver);
  const transition = (target: ElementStub, type: string, propertyName = "transform") => root.listeners.get(type)!({ type, target, propertyName } as unknown as Event);
  const tick = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  };
  return { root, canvas: canvas as unknown as HTMLCanvasElement, observed, frames, tick, mutate, transition, disconnect, resize: () => resized([], {} as ResizeObserver) };
}

describe("scene layout wakeups", () => {
  it("wakes for new HUD panels and resizes but ignores its own label writes", () => {
    const env = environment();
    const changed = vi.fn();
    const stop = observeSceneLayout(env.canvas, changed);
    env.tick();
    expect(changed).toHaveBeenCalledTimes(1);
    const label = env.root.append(new ElementStub("labels")).append(new ElementStub("label"));
    env.mutate(label);
    env.tick();
    expect(changed).toHaveBeenCalledTimes(1);
    const holder = env.root.append(new ElementStub("holder"));
    const panel = holder.append(new ElementStub("hud"));
    env.mutate(holder, "childList", [panel]);
    env.resize();
    expect(env.observed.has(panel)).toBe(true);
    expect(env.frames.size).toBe(1);
    env.tick();
    expect(changed).toHaveBeenCalledTimes(2);
    panel.remove();
    env.mutate(holder, "childList", [], [panel]);
    expect(env.observed.has(panel)).toBe(false);
    stop();
    env.tick();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(env.disconnect).toHaveBeenCalledTimes(2);
    expect(env.root.listeners.size).toBe(0);
  });

  it("follows moving HUD transforms, then sleeps after completion or panel removal", () => {
    const env = environment();
    const changed = vi.fn();
    const panel = env.root.append(new ElementStub("hud"));
    const stop = observeSceneLayout(env.canvas, changed);
    env.tick();
    env.transition(panel, "transitionrun");
    env.tick();
    expect(env.frames.size).toBe(1);
    env.transition(panel, "transitionend");
    env.tick();
    expect(env.frames.size).toBe(0);
    env.transition(panel, "transitionrun");
    panel.remove();
    env.tick();
    expect(env.frames.size).toBe(0);
    stop();
  });

  it("ignores child hover transforms and text updates, but wakes when content resizes its panel", () => {
    const env = environment();
    const panel = env.root.append(new ElementStub("hud"));
    const child = panel.append(new ElementStub("button"));
    const changed = vi.fn();
    const stop = observeSceneLayout(env.canvas, changed);
    env.tick();
    env.mutate(child);
    env.mutate(child, "characterData");
    env.mutate(panel, "childList", [child]);
    env.transition(child, "transitionrun");
    env.transition(child, "transitionrun", "padding");
    env.transition(child, "transitionrun", "margin-left");
    env.tick();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(env.frames.size).toBe(0);
    env.resize();
    env.tick();
    expect(changed).toHaveBeenCalledTimes(2);
    env.transition(env.root, "transitionrun");
    env.tick();
    expect(changed).toHaveBeenCalledTimes(3);
    expect(env.frames.size).toBe(1);
    env.transition(env.root, "transitioncancel");
    env.tick();
    expect(env.frames.size).toBe(0);
    stop();
  });
});
