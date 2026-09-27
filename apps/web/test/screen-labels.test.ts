import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { hideLabel, showLabel, viewState } from "../src/scene/ScreenLabels.tsx";

const W = 1076;
const H = 848;

/** Where a world point lands on screen for a camera. */
function screen(camera: PerspectiveCamera, point: Vector3): [number, number] {
  const p = point.clone().project(camera);
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
}

/** A camera that has been rendered at the Observatory's starting pose. */
function rendered(): PerspectiveCamera {
  const camera = new PerspectiveCamera(45, W / H, 0.1, 4000);
  camera.position.set(0, 40, 60);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

describe("screen labels follow the camera of the frame being drawn", () => {
  // camera-controls moves the camera in its frame callback (position and lookAt) and
  // leaves the world matrix to the renderer, which updates it after the labels are placed.
  const moveLikeCameraControls = (camera: PerspectiveCamera) => {
    camera.position.set(0, 52, 55);
    camera.lookAt(0, 0, 4);
  };

  it("places labels where the moved camera shows their anchors", () => {
    const camera = rendered();
    viewState(camera, W, H);
    moveLikeCameraControls(camera);
    viewState(camera, W, H);
    const fresh = new PerspectiveCamera(45, W / H, 0.1, 4000);
    fresh.position.set(0, 52, 55);
    fresh.lookAt(0, 0, 4);
    fresh.updateMatrixWorld();
    const anchor = new Vector3(-30, 0.9, 12);
    const [x, y] = screen(camera, anchor);
    const [fx, fy] = screen(fresh, anchor);
    expect(x).toBeCloseTo(fx, 3);
    expect(y).toBeCloseTo(fy, 3);
  });
});

describe("showing and hiding a label needs no repaint", () => {
  // Positions are compositor properties (transform); visibility is a paint property. When
  // raster falls behind (a busy machine, SwiftShader), Chromium composites new positions
  // over old raster: labels just shown stay blank and labels just hidden stay drawn where
  // they were. Showing and hiding must be compositor changes too.
  const label = () => ({ style: {} as Record<string, string>, dataset: {} as Record<string, string> });

  it("shows a label by opacity and transform, never visibility", () => {
    const el = label();
    showLabel(el as unknown as HTMLElement, 120.4, 80.6);
    // No inline opacity left: the stylesheet's (1, or 0.5 for a dimmed label) applies.
    expect(el.style).toEqual({ transform: "translate3d(120px, 81px, 0)", opacity: "", pointerEvents: "" });
    expect(el.dataset["shown"]).toBe("true");
  });

  it("hides a label by opacity and keeps it from taking clicks", () => {
    const el = label();
    showLabel(el as unknown as HTMLElement, 10, 10);
    hideLabel(el as unknown as HTMLElement);
    expect(el.style["opacity"]).toBe("0");
    expect(el.style["pointerEvents"]).toBe("none");
    expect(el.style["visibility"]).toBeUndefined();
    expect(el.dataset["shown"]).toBe("false");
  });
});
