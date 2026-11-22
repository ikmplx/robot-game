import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import type { Solid } from "./platformer";
import { treasure } from "./route";

export function createTreasureChest(scene: Scene, workshop: Workshop, solids: Solid[]) {
  const { box, material, shadows } = workshop;
  const oak = material("Chest walnut", "#77413A");
  const oakBright = material("Chest polished walnut", "#9C5E43");
  const inside = material("Chest lining", "#332432");
  const brass = material("Chest brass edging", "#E1A64D", 0.18);
  const gold = material("Treasure gold", "#FFD46C", 0.38);
  const lock = material("Chest keyhole", "#452D34");
  const root = new TransformNode("Treasure chest", scene);
  root.position.copyFrom(treasure);
  const lid = new TransformNode("Chest hinged lid", scene);
  lid.parent = root;
  lid.position.set(0, 1.13, 0.92);

  const base = box("Chest base", [3.32, 0.33, 1.98], [0, 0.18, 0], oak, root);
  base.receiveShadows = true;
  shadows.addShadowCaster(base, false);
  for (const side of [-1, 1]) {
    box("Chest long board", [3.28, 0.92, 0.21], [0, 0.66, side * 0.87], oakBright, root);
    box("Chest short board", [0.21, 0.92, 1.63], [side * 1.54, 0.66, 0], oak, root);
    box("Chest front rim", [3.37, 0.1, 0.15], [0, 1.1, side * 0.94], brass, root);
    box("Chest side rim", [0.13, 0.1, 1.74], [side * 1.62, 1.1, 0], brass, root);
    for (const end of [-1, 1]) {
      box("Chest corner angle", [0.15, 1.07, 0.09], [side * 1.51, 0.56, end * 0.994], brass, root);
    }
  }
  box("Chest lining", [2.88, 0.11, 1.52], [0, 0.39, 0], inside, root);
  box("Lid bottom", [3.4, 0.22, 1.99], [0, 0.15, -0.92], oak, lid);
  box("Rounded lid edge", [3.35, 0.19, 1.72], [0, 0.33, -0.92], oakBright, lid);
  box("Rounded lid crown", [3.31, 0.16, 1.38], [0, 0.48, -0.92], oakBright, lid);
  for (const x of [-1.12, 1.12]) {
    box("Brass lid strap", [0.19, 0.09, 1.39], [x, 0.574, -0.92], brass, lid);
    box("Brass end strap", [0.19, 0.29, 0.076], [x, 0.24, -1.883], brass, lid);
  }
  box("Lock plate", [0.54, 0.44, 0.13], [0, 0.07, -1.971], brass, lid);
  box("Keyhole", [0.11, 0.19, 0.055], [0, 0.072, -2.043], lock, lid);

  const coinOptions = { height: 0.08, diameter: 0.31, tessellation: 14 };
  for (let i = 0; i < 15; i++) {
    const coin = CreateCylinder("Coins inside chest", coinOptions, scene);
    coin.parent = root;
    coin.position.set((i % 5 - 2) * 0.47 + Math.sin(i) * 0.16, 0.48 + (i % 4) * 0.12, (Math.floor(i / 5) - 1) * 0.39);
    coin.rotation.set(Math.sin(i) * 0.75, 0, Math.cos(i) * 0.62);
    coin.material = gold;
  }
  const flyingCoins = Array.from({ length: 11 }, () => {
    const coin = CreateCylinder("Reward coin", coinOptions, scene);
    coin.parent = root;
    coin.material = gold;
    return coin;
  });
  solids.push({
    min: new Vector3(treasure.x - 1.68, treasure.y, treasure.z - 1),
    max: new Vector3(treasure.x + 1.68, treasure.y + 1.42, treasure.z + 1),
  });

  return {
    amount: 25,
    draw(progress: number) {
      const opening = Math.min(1, progress / 0.52);
      lid.rotation.x = 1.75 * (1 - (1 - opening) ** 3);
      for (const [index, coin] of flyingCoins.entries()) {
        const flight = (progress - 0.21 - index * 0.028) / 0.48;
        coin.setEnabled(flight > 0 && flight < 1);
        if (!coin.isEnabled()) continue;
        const side = (index % 2 === 0 ? 1 : -1) * (0.65 + (index % 5) * 0.26);
        coin.position.set(side * flight, 0.83 + 2.48 * Math.sin(flight * Math.PI), -0.16 - (1.2 + index * 0.1) * flight);
        coin.rotation.set(1 + flight * 8.5, index + flight * 5, side);
      }
    },
  };
}
