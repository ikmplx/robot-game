import { Engine } from "@babylonjs/core/Engines/engine";
import { setupFullscreen } from "./fullscreen";
import { createInput } from "./input";
import { createPlatformerScene } from "./scene";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const errorMessage = document.querySelector<HTMLParagraphElement>("#scene-error")!;
const cleanupFullscreen = setupFullscreen(
  document.querySelector<HTMLElement>(".viewport")!,
  document.querySelector<HTMLButtonElement>("#fullscreen")!,
  document.querySelector<HTMLElement>("#fullscreen-status")!,
);
import.meta.hot?.dispose(cleanupFullscreen);

try {
  const engine = new Engine(canvas, true);
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5));
  const input = createInput(
    canvas,
    document.querySelector<HTMLElement>("#stick")!,
    document.querySelector<HTMLButtonElement>("#jump")!,
    document.querySelector<HTMLButtonElement>("#attack")!,
    document.querySelector<HTMLButtonElement>("#interact")!,
    document.querySelector<HTMLButtonElement>("#restart")!,
  );
  const scene = createPlatformerScene(engine, input);
  const resize = new ResizeObserver(() => engine.resize());
  resize.observe(canvas);
  engine.runRenderLoop(() => {
    input.pollGamepad();
    scene.render();
  });

  import.meta.hot?.dispose(() => {
    input.dispose();
    resize.disconnect();
    engine.dispose();
  });
} catch (error) {
  console.error(error);
  errorMessage.textContent = "Не удалось запустить 3D-сцену. Проверьте поддержку WebGL в браузере.";
  errorMessage.hidden = false;
}
