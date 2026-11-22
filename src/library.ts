import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import booksUrl from "./assets/library-books.jpg";
import portraitUrl from "./assets/library-portrait.jpg";
import type { Workshop } from "./level";
import { bossArena, hazard, room } from "./route";
import { ellipsoid } from "./visual-mesh";

export function furnishLibrary(scene: Scene, workshop: Workshop) {
  const { box, material, textures } = workshop;
  const firstMesh = scene.meshes.length;
  const ink = material("Midnight oak", "#2F486A", 0.08, textures.wood);
  const walnut = material("Walnut joinery", "#775139", 0.08, textures.wood);
  const brass = material("Gilded library fittings", "#BB8750", 0.22);
  const flame = material("Amber lamp glass", "#FFC475", 0.76);
  const bookcase = material("Book spine atlas", "#FFFFFF", 0.15, new Texture(booksUrl, scene));
  const portrait = material("Framed adventurer study", "#F6DDBA", 0.1, new Texture(portraitUrl, scene));
  const carpet = material("Indigo aisle carpet", "#28446E", 0.16, textures.linen);
  const carpetInset = material("Woven runner band", "#526C95", 0.14, textures.linen);
  const wovenGold = material("Woven runner medallions", "#A97D49", 0.22, textures.linen);
  const moonGlass = material("Stained moon glass", "#597DBB", 0.45);
  const moonLight = material("Bright window panes", "#8FB8D4", 0.48);
  const windowFrame = material("Window tracery", "#3A5079", 0.1);

  function makeBookcase(x: number, bottom: number, z: number, side: number, width: number, height: number) {
    const root = new TransformNode("Archival bookcase", scene);
    root.position.set(x, bottom + height / 2, z);
    root.rotation.y = side * Math.PI / 2;
    box("Bookcase back", [width + 0.14, height + 0.24, 0.22], [0, 0, 0.05], ink, root);
    const books = CreatePlane("Textured rows of library books", { width, height }, scene);
    books.parent = root;
    books.position.z = -0.09;
    books.material = bookcase;
    for (const edge of [-1, 1]) {
      box("Bookcase fluted post", [0.24, height + 0.36, 0.32], [edge * (width / 2 + 0.05), 0, -0.12], walnut, root);
      box("Gilt bookcase post inlay", [0.047, height - 0.2, 0.02],
        [edge * (width / 2 + 0.05), 0, -0.287], brass, root);
      box("Bookcase cornice", [width + 0.41, 0.27, 0.4], [0, edge * (height / 2 + 0.1), -0.11], ink, root);
      box("Gilt bookcase cornice", [width + 0.23, 0.055, 0.05], [0, edge * (height / 2 + 0.1), -0.33], brass, root);
    }
    for (const fraction of [-0.26, -0.005, 0.247]) {
      box("Shelf lip", [width, 0.085, 0.185], [0, fraction * height, -0.128], walnut, root);
    }
    return root;
  }

  function lamp(parent: TransformNode, x: number, y: number, z: number) {
    ellipsoid("Library lamp glass", parent, flame, [x, y, z], [0.32, 0.8, 0.33]);
    for (const edge of [-1, 1]) {
      box("Lantern brass cap", [0.41, 0.095, 0.42], [x, y + edge * 0.33, z], brass, parent);
    }
    box("Lantern bracket", [0.095, 0.065, 0.66], [x, y - 0.41, z + 0.26], brass, parent);
  }

  for (const side of [-1, 1]) {
    for (let z = 1; z < room.back - 4; z += 8.1) {
      const shelf = makeBookcase(side * (room.halfWidth - 0.84), 0.85, z, side, 7.55, 10.1);
      if (Math.round(z / 8.1) % 2 === 0) lamp(shelf, -side * 3.75, -0.9, -0.53);
      if (z > 54 && z < 225) makeBookcase(side * (room.halfWidth - 0.89), 11.6, z, side, 7.55, 9.3);
    }
    for (const z of [16, 25.2, 34.4]) {
      const shelf = makeBookcase(side * 17.5, 0.46, z, side, 8.65, 8.5);
      lamp(shelf, -side * 4.32, -0.74, -0.6);
    }
  }

  function runner(x: number, z: number, length: number, width: number) {
    box("Library aisle runner", [width, 0.013, length], [x, 0.009, z], carpet).receiveShadows = true;
    for (const side of [-1, 1]) {
      for (const [offset, surface] of [[0.25, brass], [0.41, carpetInset]] as const) {
        box("Carpet woven side trim", [0.055, 0.013, length - 0.24],
          [x + side * (width / 2 - offset), 0.014, z], surface);
        box("Carpet woven end trim", [width - 2 * offset, 0.013, 0.055],
          [x, 0.015, z + side * (length / 2 - offset / 2)], surface);
      }
    }
    for (const edge of [-1, 1]) {
      const medallionZ = z + edge * (length / 2 - 0.86);
      const ring = CreateTorus("Gilded carpet medallion", { diameter: 0.83, thickness: 0.031, tessellation: 20 }, scene);
      ring.position.set(x, 0.021, medallionZ);
      ring.scaling.y = 0.38;
      ring.material = wovenGold;
      for (const side of [-1, 1]) {
        const petal = box("Woven medallion petal", [0.063, 0.012, 0.56], [x, 0.02, medallionZ], wovenGold);
        petal.rotation.y = side * Math.PI / 4;
      }
    }
  }
  runner(0, -0.5, 12.55, 4.95);
  runner(0, 33.2, 15.2, 5.65);
  runner(-7, 48.2, 6.2, 5.65);
  runner(-7, 72.35, 6.4, 5.65);

  const stand = new TransformNode("Adventurer portrait display", scene);
  stand.position.set(-6.6, 0, 2.3);
  stand.rotation.y = -0.17;
  box("Portrait stand base", [1.27, 0.09, 0.75], [0, 2.38, 0], walnut, stand);
  box("Portrait frame", [1.15, 1.4, 0.1], [0, 3.04, 0], brass, stand);
  const picture = CreatePlane("Portrait of the adventurer and panda", { width: 1.04, height: 1.29 }, scene);
  picture.parent = stand;
  picture.position.set(0, 3.04, -0.06);
  picture.material = portrait;

  function arch(name: string, z: number, halfSpan: number, spring: number, rise: number) {
    const root = new TransformNode(name, scene);
    root.position.z = z;
    for (const side of [-1, 1]) {
      box("Library pilaster", [0.67, spring, 0.77], [side * halfSpan, spring / 2, 0], ink, root);
      box("Gold pilaster inlay", [0.078, spring - 0.43, 0.046], [side * halfSpan, spring / 2, -0.414], brass, root);
      box("Pilaster capital", [0.93, 0.26, 0.98], [side * halfSpan, spring - 0.13, 0], walnut, root);
      lamp(root, side * (halfSpan - 0.55), 2.75, -0.47);
    }
    const count = 18;
    for (let i = 0; i < count; i++) {
      const a = Math.PI * i / count, b = Math.PI * (i + 1) / count;
      const x1 = Math.cos(a) * halfSpan, x2 = Math.cos(b) * halfSpan;
      const y1 = spring + Math.sin(a) * rise, y2 = spring + Math.sin(b) * rise;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const x = (x1 + x2) / 2, y = (y1 + y2) / 2;
      box("Segmented library arch", [length + 0.19, 0.48, 0.62], [x, y, 0], ink, root).rotation.z = angle;
      box("Gold arch inlay", [length + 0.065, 0.07, 0.056], [x, y, -0.335], brass, root).rotation.z = angle;
    }
    return root;
  }

  arch("Main library aisle arch", hazard.back + 0.7, 15.1, 8.05, 8.5);
  arch("Reading hall arch", 47.6, 16.5, 8.05, 9.5);
  for (const z of [61, 87, 115, 143, 171, 199]) arch("Upper library arch", z, 26.8, 21.1, 6.5);

  for (const side of [-1, 1]) {
    const archive = makeBookcase(bossArena.x + side * 6.9, bossArena.top + 0.75, 292.2, 0, 7.5, 6.2);
    lamp(archive, -side * 3.65, 0.56, -0.68);
    for (const z of [13, 41, 69, 125, 181]) {
      const root = new TransformNode("Moonlit library window", scene);
      root.position.set(side * (room.halfWidth - 0.41), z < 44 ? 16.6 : 24.4, z);
      root.rotation.y = side * Math.PI / 2;
      box("Moonlit glass", [5.8, 6.4, 0.14], [0, 0, 0], moonGlass, root);
      box("Window blue pane", [3.35, 6.12, 0.15], [0, 0, -0.035], moonLight, root);
      const rose = CreateTorus("Round brass window tracer", { diameter: 3.8, thickness: 0.14, tessellation: 36 }, scene);
      rose.parent = root;
      rose.position.z = -0.12;
      rose.rotation.x = Math.PI / 2;
      rose.material = brass;
      for (const edge of [-1, 0, 1]) {
        box("Window horizontal mullion", [6.05, 0.14, 0.15], [0, edge * 3.18, -0.11], windowFrame, root);
        box("Window vertical mullion", [0.15, 6.49, 0.16], [edge * 2.94, 0, -0.11], windowFrame, root);
      }
    }
  }

  // Batch fixed decorations by material and nearby space so distant shelves still cull.
  const batches = new Map<string, Mesh[]>();
  for (const mesh of scene.meshes.slice(firstMesh)) {
    if (!(mesh instanceof Mesh) || mesh.receiveShadows || !mesh.material) continue;
    const { x, z } = mesh.computeWorldMatrix(true).getTranslation();
    const key = [Math.floor(x / 14), Math.floor(z / 18), mesh.material.uniqueId].join("/");
    const batch = batches.get(key);
    if (batch) batch.push(mesh);
    else batches.set(key, [mesh]);
  }
  for (const batch of batches.values()) {
    const decoration = batch.length === 1 ? batch[0] : Mesh.MergeMeshes(batch, true, true);
    decoration?.freezeWorldMatrix();
  }

}
