import { Engine } from "@babylonjs/core/Engines/engine";
import { createTestScene } from "./scene";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const errorMessage = document.querySelector<HTMLParagraphElement>("#scene-error")!;

try {
  const engine = new Engine(canvas, true);
  // Cap the pixel ratio to keep the render target small on high-density phones.
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5));

  const scene = createTestScene(engine, canvas);
  const resize = new ResizeObserver(() => engine.resize());
  resize.observe(canvas);
  engine.runRenderLoop(() => scene.render());

  import.meta.hot?.dispose(() => {
    resize.disconnect();
    engine.dispose();
  });
} catch (error) {
  console.error(error);
  errorMessage.textContent = "Не удалось запустить 3D-сцену. Проверьте поддержку WebGL в браузере.";
  errorMessage.hidden = false;
}
