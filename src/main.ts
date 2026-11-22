import { Engine } from "@babylonjs/core/Engines/engine";
import { setupFullscreen } from "./fullscreen";
import { createInput } from "./input";
import { createPlatformerScene } from "./scene";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const loading = document.querySelector<HTMLParagraphElement>("#scene-loading")!;
const errorMessage = document.querySelector<HTMLParagraphElement>("#scene-error")!;
const cleanupFullscreen = setupFullscreen(
  document.querySelector<HTMLElement>(".viewport")!,
  document.querySelector<HTMLButtonElement>("#fullscreen")!,
  document.querySelector<HTMLElement>("#fullscreen-status")!,
);
import.meta.hot?.dispose(cleanupFullscreen);

let disposed = false;
const cleanup: (() => void)[] = [];
import.meta.hot?.dispose(() => {
  disposed = true;
  for (const release of cleanup.splice(0).reverse()) release();
});

async function start() {
  const engine = new Engine(canvas, true);
  cleanup.push(() => engine.dispose());
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5));
  const input = createInput(
    canvas,
    document.querySelector<HTMLElement>("#stick")!,
    document.querySelector<HTMLButtonElement>("#jump")!,
    document.querySelector<HTMLButtonElement>("#attack")!,
    document.querySelector<HTMLButtonElement>("#interact")!,
    document.querySelector<HTMLButtonElement>("#restart")!,
  );
  cleanup.push(input.dispose);
  const scene = await createPlatformerScene(engine, input);
  if (disposed) return;
  const resize = new ResizeObserver(() => engine.resize());
  resize.observe(canvas);
  cleanup.push(() => resize.disconnect());
  engine.runRenderLoop(() => {
    input.pollGamepad();
    scene.render();
  });

  loading.hidden = true;
}

void start().catch((error: unknown) => {
  if (disposed) return;
  for (const release of cleanup.splice(0).reverse()) release();
  console.error(error);
  loading.hidden = true;
  errorMessage.textContent = "Не удалось загрузить 3D-сцену. Обновите страницу и проверьте поддержку WebGL.";
  errorMessage.hidden = false;
});
