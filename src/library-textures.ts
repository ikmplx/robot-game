import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";

const size = 256;

type Paint = (context: CanvasRenderingContext2D, random: () => number) => void;

function paintedTexture(scene: Scene, name: string, paint: Paint) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  let seed = 3805;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  paint(context, random);
  const texture = new DynamicTexture(name, canvas, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  texture.anisotropicFilteringLevel = 8;
  texture.update();
  return texture;
}

function fill(context: CanvasRenderingContext2D, color: string) {
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
}

function speckle(context: CanvasRenderingContext2D, random: () => number, count: number, length: number) {
  for (let i = 0; i < count; i++) {
    context.fillStyle = i % 2 ? "#ffffff26" : "#130f1e24";
    context.fillRect(random() * size, random() * size, 1 + random() * length, 1);
  }
}

export function createLibraryTextures(scene: Scene) {
  const wood = paintedTexture(scene, "Oiled timber grain", (context, random) => {
    fill(context, "#c1a88e");
    for (let i = 0; i < 460; i++) {
      const x = random() * size;
      const y = random() * size;
      const length = 16 + random() * 145;
      const bow = (random() - 0.5) * 4;
      context.strokeStyle = i % 3 ? "#5c33252e" : "#ffeecc5c";
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + length * 0.32, y + bow, x + length * 0.66, y - bow, x + length, y);
      context.stroke();
    }
  });

  const linen = paintedTexture(scene, "Woven book cloth", (context, random) => {
    fill(context, "#bbb7ad");
    for (let offset = 0; offset < size; offset += 4) {
      context.fillStyle = "#f8f0dc4b";
      context.fillRect(offset, 0, 1, size);
      context.fillStyle = "#26253734";
      context.fillRect(0, offset, size, 1);
    }
    speckle(context, random, 1800, 2);
  });

  const paper = paintedTexture(scene, "Flecked parchment", (context, random) => {
    fill(context, "#f7ebcd");
    speckle(context, random, 3800, 5);
    context.strokeStyle = "#88633b24";
    for (let y = 12; y < size; y += 11) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }
  });

  const stone = paintedTexture(scene, "Veined blue slate", (context, random) => {
    fill(context, "#b3b5c0");
    for (let i = 0; i < 200; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 8 + random() * 30;
      const shade = context.createRadialGradient(x, y, 1, x, y, radius);
      shade.addColorStop(0, i % 2 ? "#eff0f728" : "#242b552f");
      shade.addColorStop(1, "#85818b00");
      context.fillStyle = shade;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    speckle(context, random, 2500, 3);
  });

  const spirit = paintedTexture(scene, "Spectral tabby markings", (context, random) => {
    fill(context, "#c3edf7");
    context.strokeStyle = "#455B9955";
    context.lineCap = "round";
    for (let stripe = 0; stripe < 7; stripe++) {
      const y = 19 + stripe * 37;
      for (let x = -60; x < size; x += 72) {
        const drift = random() * 12;
        context.lineWidth = 2 + random() * 4;
        context.beginPath();
        context.moveTo(x, y + drift);
        context.quadraticCurveTo(x + 20, y - 17, x + 58, y + drift * 0.5);
        context.stroke();
      }
    }
    speckle(context, random, 1500, 2);
  });

  const fur = paintedTexture(scene, "Fine red panda fur", (context, random) => {
    fill(context, "#e8d5be");
    for (let i = 0; i < 3800; i++) {
      const x = random() * size;
      const y = random() * size;
      context.strokeStyle = i % 2 ? "#fff8da45" : "#63291e3d";
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (random() - 0.5) * 5, y + 1 + random() * 8);
      context.stroke();
    }
  });

  return { wood, linen, paper, stone, spirit, fur };
}
