import { CameraControlsImpl } from "@react-three/drei";

/** A demand frame can follow minutes of idle time; flights must still ease in. */
export class DemandCameraControls extends CameraControlsImpl {
  private moving = false;

  override update(delta: number): boolean {
    // Only the first frame after sleep includes idle time. Capping every frame
    // makes camera flights take many seconds on a slow GPU.
    const updated = super.update(this.moving ? delta : Math.min(delta, 1 / 30));
    this.moving = updated;
    return updated;
  }
}

/**
 * Wake a sleeping scene when its DOM layout changes. Label transforms are written
 * by the scene itself, so observing them would create an endless render loop.
 */
export function observeSceneLayout(canvas: HTMLCanvasElement, changed: () => void): () => void {
  const root = canvas.closest("[data-stage-root]") ?? canvas.closest("[data-stage]") ?? canvas.parentElement;
  if (!root) return () => undefined;
  let frame = 0;
  let live = true;
  const transitions = new Map<EventTarget, Set<string>>();
  const flush = () => {
    frame = 0;
    if (!live) return;
    changed();
    for (const target of transitions.keys()) if (!root.contains(target as Node)) transitions.delete(target);
    if (transitions.size) schedule();
  };
  const schedule = () => {
    if (live && !frame) frame = requestAnimationFrame(flush);
  };
  const resize = new ResizeObserver(schedule);
  const observed = new Set<Element>();
  const refresh = () => {
    const next = new Set<Element>([root, canvas, ...root.querySelectorAll("[data-hud]")]);
    for (const el of observed) if (!next.has(el)) { resize.unobserve(el); observed.delete(el); }
    for (const el of next) if (!observed.has(el)) { resize.observe(el); observed.add(el); }
  };
  // Descendant content is covered by the panel's ResizeObserver. Only panels,
  // the canvas and their ancestors can move those rectangles via transforms.
  const boundary = (el: Element) => !el.closest(".scene-labels") &&
    (el === canvas || el.matches("[data-hud]") || el.contains(canvas) || !!el.querySelector("[data-hud]"));
  const mutations = new MutationObserver((records) => {
    if (!records.some((record) => {
      if (record.type === "characterData") return false;
      const el = record.target as Element;
      if (el.closest(".scene-labels")) return false;
      if (record.type === "childList") {
        // A removed panel is no longer discoverable through its parent.
        if ([...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1 && boundary(node as Element))) return true;
        if (el.closest("[data-hud]")) return false;
      }
      return boundary(el);
    })) return;
    refresh();
    schedule();
  });
  refresh();
  mutations.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden", "data-hud", "data-full", "open"] });
  // ResizeObserver covers size transitions, but transforms move panels without resizing.
  const transition = (event: Event) => {
    const e = event as TransitionEvent;
    const target = e.target as Element | null;
    if (!target || !boundary(target)) return;
    if (!/^(transform|translate|scale|width|height|top|right|bottom|left|margin.*|padding.*|flex-basis|grid-template-.*)$/.test(e.propertyName)) return;
    if (e.type === "transitionrun") {
      const properties = transitions.get(target) ?? new Set<string>();
      properties.add(e.propertyName);
      transitions.set(target, properties);
    } else {
      const properties = transitions.get(target);
      properties?.delete(e.propertyName);
      if (!properties?.size) transitions.delete(target);
    }
    schedule();
  };
  root.addEventListener("transitionrun", transition);
  root.addEventListener("transitionend", transition);
  root.addEventListener("transitioncancel", transition);
  root.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  schedule();
  return () => {
    live = false;
    cancelAnimationFrame(frame);
    resize.disconnect();
    mutations.disconnect();
    root.removeEventListener("transitionrun", transition);
    root.removeEventListener("transitionend", transition);
    root.removeEventListener("transitioncancel", transition);
    root.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
  };
}
