import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import type { Solid } from "./platformer";
import { lowerSideRooms } from "./route";
import { ellipsoid, ovalBetween, pivot } from "./visual-mesh";

export function createLibrarian(scene: Scene, workshop: Workshop, solids: Solid[]) {
  const { box, material, textures, shadows } = workshop;
  const position = lowerSideRooms.librarian;
  const root = new TransformNode("Librarian", scene);
  root.position.copyFrom(position);
  const body = pivot("Librarian body", root);
  const head = pivot("Librarian head", body, [0, 1.66, 0.025]);

  const fabric = material("Librarian blue coat", "#426F92", 0.12, textures.linen);
  const velvet = material("Librarian dark cuffs", "#253E62", 0.1, textures.linen);
  const skin = material("Librarian skin", "#D9A985", 0.08);
  const hair = material("Librarian silver hair", "#CCC5BE", 0.12);
  const gold = material("Librarian brass", "#F5C779", 0.34);
  const dark = material("Librarian shoes and pupils", "#302739", 0.05);
  const pages = material("Librarian book pages", "#FFE4A9", 0.2, textures.paper);
  const cover = material("Librarian book cover", "#86484D", 0.13, textures.linen);
  const walnut = material("Reading desk walnut", "#825831", 0.09, textures.wood);

  const skirt = CreateCylinder("Librarian long coat", {
    height: 0.86, diameterTop: 0.52, diameterBottom: 0.78, tessellation: 18,
  }, scene);
  skirt.parent = body;
  skirt.position.y = 0.6;
  skirt.scaling.z = 0.72;
  skirt.material = fabric;
  ellipsoid("Librarian coat shoulders", body, fabric, [0, 1.14, 0], [0.68, 0.67, 0.44]);
  ellipsoid("Librarian collar", body, velvet, [0, 1.4, 0], [0.36, 0.23, 0.34]);
  box("Librarian braided belt", [0.51, 0.075, 0.39], [0, 0.91, 0], velvet, body);
  box("Librarian brooch", [0.073, 0.073, 0.03], [-0.14, 1.28, 0.185], gold, body).rotation.z = Math.PI / 4;

  ellipsoid("Librarian face", head, skin, [0, 0, 0.035], [0.43, 0.49, 0.4]);
  ellipsoid("Librarian hair", head, hair, [0, 0.09, -0.067], [0.45, 0.43, 0.35]);
  ellipsoid("Librarian swept hair", head, hair, [-0.065, 0.183, 0.055], [0.34, 0.19, 0.34]);
  ellipsoid("Librarian nose", head, skin, [0, -0.025, 0.237], [0.095, 0.12, 0.11]);
  box("Glasses bridge", [0.077, 0.016, 0.019], [0, 0.029, 0.252], gold, head);

  for (const side of [-1, 1]) {
    ellipsoid("Librarian shoe", root, dark, [side * 0.16, 0.085, 0.083], [0.22, 0.165, 0.34]);
    ellipsoid("Librarian ear", head, skin, [side * 0.205, -0.024, 0.039], [0.09, 0.15, 0.092]);
    ellipsoid("Librarian eye", head, dark, [side * 0.095, 0.027, 0.217], [0.048, 0.048, 0.026]);
    ellipsoid("Librarian moustache", head, hair, [side * 0.058, -0.102, 0.215], [0.12, 0.061, 0.053]).rotation.z = side * -0.21;
    const frame = CreateTorus("Round glasses", { diameter: 0.149, thickness: 0.014, tessellation: 18 }, scene);
    frame.parent = head;
    frame.position.set(side * 0.095, 0.027, 0.245);
    frame.rotation.x = Math.PI / 2;
    frame.material = gold;

    ovalBetween("Librarian sleeve", body, fabric, [side * 0.27, 1.27, 0], [side * 0.37, 0.935, 0.19], 0.24);
    ovalBetween("Librarian cuff", body, velvet, [side * 0.38, 0.96, 0.17], [side * 0.235, 1.03, 0.36], 0.19);
    ellipsoid("Librarian hand", body, skin, [side * 0.227, 1.055, 0.409], [0.15, 0.135, 0.16]);
  }

  const book = pivot("Open atlas", body, [0, 1.09, 0.4]);
  book.rotation.x = -0.35;
  for (const side of [-1, 1]) {
    const leaf = pivot("Atlas leaf", book);
    leaf.rotation.z = side * 0.26;
    box("Atlas binding", [0.25, 0.036, 0.31], [side * 0.125, -0.009, 0], cover, leaf);
    box("Atlas paper", [0.233, 0.043, 0.282], [side * 0.12, 0.022, 0], pages, leaf);
  }

  const marker = pivot("Librarian interaction marker", root, [0, 2.32, 0]);
  const sign = box("Brass dialogue marker", [0.2, 0.2, 0.2], [0, 0, 0], gold, marker);
  sign.rotation.set(0.61, 0, Math.PI / 4);
  for (const mesh of root.getChildMeshes()) {
    if (mesh !== sign) shadows.addShadowCaster(mesh, false);
  }
  solids.push({
    min: position.add(new Vector3(-0.34, 0, -0.34)),
    max: position.add(new Vector3(0.34, 1.85, 0.34)),
  });

  const deskZ = position.z + 2.05;
  const desk = box("Reading desk top", [3.24, 0.15, 0.88], [position.x, 1.02, deskZ], walnut);
  shadows.addShadowCaster(desk, false);
  for (const side of [-1, 1]) {
    box("Reading desk support", [0.15, 0.96, 0.74], [position.x + side * 1.4, 0.49, deskZ], walnut);
    box("Reading desk brass edge", [3.16, 0.04, 0.024], [position.x, 1.004, deskZ + side * 0.44], gold);
  }
  box("Reading desk atlas", [0.48, 0.105, 0.35], [position.x - 0.64, 1.158, deskZ], cover).rotation.y = 0.22;
  box("Reading desk map", [0.63, 0.023, 0.4], [position.x + 0.3, 1.107, deskZ], pages).rotation.y = -0.14;
  solids.push({
    min: new Vector3(position.x - 1.62, 0, deskZ - 0.44),
    max: new Vector3(position.x + 1.62, 1.095, deskZ + 0.44),
  });

  const restFacing = -2.6;
  root.rotation.y = restFacing;
  return {
    position,
    draw(clock: number, dt: number, player: Vector3) {
      const dx = player.x - position.x;
      const dz = player.z - position.z;
      const nearby = Math.abs(player.y - position.y) < 0.8 && Math.hypot(dx, dz) < 3.25;
      const turn = (nearby ? Math.atan2(dx, dz) : restFacing) - root.rotation.y;
      root.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-dt * 8));
      body.position.y = 0.012 * Math.sin(clock * 2.6);
      head.rotation.z = 0.035 * Math.sin(clock * 1.6);
      marker.position.y = 2.32 + 0.085 * Math.sin(clock * 3);
      marker.rotation.y = clock * 1.3;
    },
  };
}
