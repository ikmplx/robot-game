import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { GLTFLoaderAnimationStartMode } from "@babylonjs/loaders/glTF/glTFFileLoader";
import "@babylonjs/loaders/glTF";
import modelUrl from "./assets/library-hero.glb?url";
import type { Workshop } from "./level";
import { pivot } from "./visual-mesh";

const clipNames = ["Idle", "Run", "Jump", "Slash", "Zipline"] as const;
type ClipName = typeof clipNames[number];

export async function createHero(scene: Scene, { shadows }: Workshop) {
  const assets = await LoadAssetContainerAsync(modelUrl, scene, {
    pluginExtension: ".glb",
    pluginOptions: { gltf: { animationStartMode: GLTFLoaderAnimationStartMode.NONE } },
  });
  const clips = Object.fromEntries(clipNames.map((name) => {
    const clip = assets.animationGroups.find((group) => group.name === name);
    if (!clip) throw new Error(`Missing hero animation: ${name}`);
    return [name, clip];
  })) as Record<ClipName, (typeof assets.animationGroups)[number]>;
  const sword = [...assets.meshes, ...assets.transformNodes].find((node) => node.name === "Sword");
  if (!sword) throw new Error("Missing hero sword");
  assets.addAllToScene();

  const avatar = new TransformNode("Library adventurer", scene);
  const visual = pivot("Adventurer visual", avatar);
  for (const root of assets.rootNodes) root.parent = visual;
  for (const mesh of assets.meshes) {
    if (mesh.getTotalVertices() > 0) shadows.addShadowCaster(mesh, false);
  }

  let current: ClipName | undefined;
  let outgoing: (typeof clips)[ClipName] | undefined;
  let transitionStart = 0;
  const draw = (clock: number, moving: boolean, grounded: boolean, swing: number, flashing: boolean, hanging: boolean) => {
    visual.setEnabled(!flashing || Math.floor(clock * 18) % 2 === 0);
    sword.setEnabled(swing > 0);

    const next = hanging ? "Zipline" : swing > 0 ? "Slash" : !grounded ? "Jump" : moving ? "Run" : "Idle";
    const clip = clips[next];
    if (next !== current) {
      outgoing?.stop();
      const previous = current && clips[current];
      outgoing = previous && previous.isPlaying && next !== "Slash" ? previous : undefined;
      if (previous && !outgoing) previous.stop();
      current = next;
      transitionStart = clock;

      const loop = next === "Idle" || next === "Run" || next === "Zipline";
      clip.start(loop, 1, clip.from, clip.to, false);
      clip.setWeightForAllAnimatables(outgoing ? 0 : 1);
      outgoing?.setWeightForAllAnimatables(1);
      if (next === "Slash") clip.pause();
    }
    if (outgoing) {
      const blend = Math.min(1, (clock - transitionStart) / 0.1);
      clip.setWeightForAllAnimatables(blend);
      outgoing.setWeightForAllAnimatables(1 - blend);
      if (blend === 1) {
        outgoing.stop();
        outgoing = undefined;
      }
    }
    if (next === "Slash") clip.goToFrame(clip.from + (clip.to - clip.from) * (1 - swing));
  };

  return { avatar, draw };
}
