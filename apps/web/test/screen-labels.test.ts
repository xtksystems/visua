import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { viewState } from "../src/scene/ScreenLabels.tsx";

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
