import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateLineSystem } from "@babylonjs/core/Meshes/Builders/linesBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { pushSolid, solidsOverlap, type Solid } from "./platformer";

type XYZ = readonly [number, number, number];

export const route = {
  spawn: new Vector3(0, 0, 0.25),
  hazard: { front: 3.25, back: 15.65 },
  arena: {
    front: 15.65, back: 23.2, top: 0, halfWidth: 4.45,
    checkpoint: new Vector3(0, 0, 16.6),
  },
  puzzle: { front: 23.45, back: 33.1, halfWidth: 4.55, homeZ: 26.4, padZ: 30.75 },
  lift: { z: 34.35, lower: 0, upper: 9.8, width: 3.3, depth: 2.5 },
  shelf: {
    front: 35.6, back: 42.3, top: 9.8, halfWidth: 4.65,
    checkpoint: new Vector3(0, 9.8, 36.25),
  },
  gateZ: 43.65,
  goal: new Vector3(0, 9.8, 46.1),
} as const;

export function createWorkshop(scene: Scene, shadows: ShadowGenerator) {
  function material(name: string, color: string, glow = 0) {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor.setAll(0.1);
    result.emissiveColor = result.diffuseColor.scale(glow);
    return result;
  }

  function box(name: string, size: XYZ, position: XYZ, surface: StandardMaterial, parent?: TransformNode) {
    const [width, height, depth] = size;
    const mesh = CreateBox(name, { width, height, depth }, scene);
    mesh.parent = parent ?? null;
    mesh.position.set(...position);
    mesh.material = surface;
    return mesh;
  }

  return { box, material, shadows };
}

export type Workshop = ReturnType<typeof createWorkshop>;

export function createLevel(scene: Scene, workshop: Workshop, solids: Solid[]) {
  const { box, material, shadows } = workshop;
  const shell = material("Deep teal", "#28535D");
  const slab = material("Painted metal", "#548A94");
  const inset = material("Recessed steel", "#263852");
  const silver = material("Aluminum", "#B8D1D4");
  const cyan = material("Cyan LEDs", "#42DAD5", 0.6);
  const amber = material("Amber LEDs", "#F8B15A", 0.5);
  const red = material("Barrier LEDs", "#F8616B", 0.65);
  const darkLight = material("Unpowered LED", "#4B6072", 0.1);
  const gold = material("Coin gold", "#F5A840", 0.3);
  const goldFace = material("Coin face", "#FFE192", 0.45);

  function hitbox(size: XYZ, center: XYZ) {
    const half = new Vector3(size[0] / 2, size[1] / 2, size[2] / 2);
    const position = new Vector3(...center);
    const solid: Solid = { min: position.subtract(half), max: position.add(half) };
    solids.push(solid);
    return solid;
  }

  function placedBlock(name: string, size: XYZ, center: XYZ, surface: StandardMaterial) {
    const block = box(name, size, center, surface);
    block.receiveShadows = true;
    hitbox(size, center);
    return block;
  }

  function enableBarrier(solid: Solid, enabled: boolean) {
    const index = solids.indexOf(solid);
    if (enabled && index < 0) solids.push(solid);
    if (!enabled && index >= 0) solids.splice(index, 1);
  }

  const { hazard, arena, puzzle, shelf, lift, gateZ, goal } = route;
  const roomHalfWidth = 17;
  const roomBack = 48;
  const roomFront = -12;
  const roomDepth = roomBack - roomFront;
  const roomCenter = (roomBack + roomFront) / 2;

  const floor = material("Room floor", "#9A847A");
  const wall = material("Room walls", "#9DA8AC");
  const molding = material("Skirting", "#556B79");
  const wood = material("Furniture wood", "#977057");
  const woodEdge = material("Furniture edges", "#684C44");
  placedBlock("Room floor", [roomHalfWidth * 2, 0.8, roomDepth], [0, -0.4, roomCenter], floor);
  placedBlock("Back wall", [35, 23, 0.65], [0, 11.5, roomBack], wall);
  placedBlock("Front wall", [35, 23, 0.65], [0, 11.5, roomFront], wall);
  box("Back molding", [34, 1.25, 0.3], [0, 0.625, roomBack - 0.49], molding);
  const planks: Vector3[][] = [];
  for (let x = -16; x <= 16; x += 2) {
    planks.push([new Vector3(x, 0.003, roomFront), new Vector3(x, 0.003, roomBack)]);
    for (let z = roomFront + 3 + (x % 4 === 0 ? 3 : 0); z < roomBack; z += 8) {
      planks.push([new Vector3(x, 0.003, z), new Vector3(Math.min(x + 2, 17), 0.003, z)]);
    }
  }
  const seams = CreateLineSystem("Floor seams", { lines: planks }, scene);
  seams.color = Color3.FromHexString("#624F56");
  seams.alpha = 0.55;

  for (const side of [-1, 1]) {
    placedBlock("Side wall", [0.7, 23, roomDepth], [side * 17, 11.5, roomCenter], wall);
    box("Side molding", [0.27, 1.25, roomDepth], [side * 16.53, 0.625, roomCenter], molding);
    for (const z of [-4, 10, 23, 36]) {
      box("Wall panel seam", [0.055, 19, 0.1], [side * 16.62, 11, z], molding);
    }

    const tableX = side * 11.8;
    const tableZ = side < 0 ? 7.7 : 19.3;
    const tableTop = side < 0 ? 8.3 : 11.4;
    box("Tabletop", [8.9, 0.78, 11], [tableX, tableTop, tableZ], wood);
    box("Table apron", [8.5, 0.5, 10.5], [tableX, tableTop - 0.52, tableZ], woodEdge);
    for (const x of [tableX - 3.65, tableX + 3.65]) {
      for (const z of [tableZ - 4.55, tableZ + 4.55]) {
        placedBlock("Table leg", [0.74, tableTop, 0.78], [x, tableTop / 2, z], woodEdge);
      }
    }
    const books = [material("Book cover", side < 0 ? "#C4674A" : "#43958D"), inset, silver];
    for (const [index, surface] of books.entries()) {
      const book = box("Stacked book", [3.5 - index * 0.25, 0.49, 4.4 - index * 0.22],
        [tableX + side * 0.7, tableTop + 0.66 + index * 0.52, tableZ + index * 0.18], surface);
      book.rotation.y = (index - 1) * 0.11;
      const pages = box("Book pages", [3.53 - index * 0.25, 0.28, 4.33 - index * 0.22], [0, 0, 0], wall, book);
      pages.position.x = -side * 0.08;
    }
  }
  for (const x of [-11.8, 11.8]) {
    box("Overhead strip", [5.2, 0.24, 18], [x, 22.5, roomCenter + 6], silver);
  }

  const bookCovers = [material("Rust book cover", "#A7503C"), shell, material("Navy book cover", "#454B69")];
  const paper = material("Book paper", "#D6C5A7");
  const binding = material("Book binding marks", "#DEA975");
  for (const [index, cover] of bookCovers.entries()) {
    const width = 4.05 - index * 0.27;
    const x = -6.1 - index * 0.19;
    const z = 0.95 - index * 0.18;
    const y = 0.4 + index * 0.8;
    const book = new TransformNode("Oversized book", scene);
    book.position.set(x, y, z);
    book.rotation.y = (index - 1) * 0.09;
    box("Pages", [width - 0.08, 0.62, 3.63], [0, 0, 0.08], paper, book);
    for (const edge of [-1, 1]) {
      box("Book cover", [width, 0.075, 3.82], [0, edge * 0.365, 0], cover, book);
      box("Spine embossing", [0.085, 0.55, 0.025], [edge * (width / 2 - 0.26), 0, -1.97], binding, book);
    }
    const spine = box("Book spine", [width, 0.78, 0.13], [0, 0, -1.895], cover, book);
    shadows.addShadowCaster(spine, false);
    hitbox([width, 0.8, 3.82], [x, y, z]);
  }

  const mugMaterial = material("Terracotta glaze", "#B65B41");
  const mug = CreateCylinder("Oversized mug", { height: 2.75, diameterTop: 2.65, diameterBottom: 2.28, tessellation: 32 }, scene);
  mug.position.set(5.65, 1.375, 1.82);
  mug.material = mugMaterial;
  shadows.addShadowCaster(mug, false);
  hitbox([2.63, 2.75, 2.63], [5.65, 1.375, 1.82]);
  const surface = CreateCylinder("Dark inside of mug", { height: 0.026, diameter: 2.44, tessellation: 32 }, scene);
  surface.position.set(5.65, 2.752, 1.82);
  surface.material = woodEdge;
  const mugRim = CreateTorus("Mug rim", { diameter: 2.55, thickness: 0.145, tessellation: 36 }, scene);
  mugRim.position.set(5.65, 2.77, 1.82);
  mugRim.material = mugMaterial;
  const handle = CreateTorus("Mug handle", { diameter: 1.75, thickness: 0.24, tessellation: 24 }, scene);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(6.94, 1.43, 1.64);
  handle.material = mugMaterial;

  const danger = material("Hazard surface", "#994045", 0.17);
  const dangerGrid = material("Hazard edge", "#EF6A53", 0.55);
  box("Dangerous floor", [33.3, 0.026, hazard.back - hazard.front],
    [0, 0.018, (hazard.front + hazard.back) / 2], danger).receiveShadows = true;
  for (const z of [hazard.front + 0.085, hazard.back - 0.085]) {
    box("Hazard boundary", [33.3, 0.033, 0.1], [0, 0.044, z], dangerGrid);
    for (let x = -15.6; x <= 15.6; x += 1.25) {
      box("Warning stripe", [0.7, 0.035, 0.18], [x, 0.044, z + (z < 8 ? 0.27 : -0.27)], dangerGrid)
        .rotation.y = -0.48;
    }
  }
  const hazardLines: Vector3[][] = [];
  for (let x = -16; x <= 16; x += 1.6) {
    hazardLines.push([new Vector3(x, 0.034, hazard.front), new Vector3(x, 0.034, hazard.back)]);
  }
  for (let z = hazard.front + 1.55; z < hazard.back; z += 1.55) {
    hazardLines.push([new Vector3(-16.6, 0.034, z), new Vector3(16.6, 0.034, z)]);
  }
  const hazardMesh = CreateLineSystem("Danger floor grid", { lines: hazardLines }, scene);
  hazardMesh.color = Color3.FromHexString("#F08A75");
  hazardMesh.alpha = 0.43;

  const cubeSize = 1.9;
  const blocks = [[0.5, 5.55], [-0.55, 9.2], [0.5, 12.85]] as const;
  for (const [x, z] of blocks) {
    const block = placedBlock("Jump cube", [cubeSize, cubeSize, cubeSize], [x, cubeSize / 2, z], slab);
    shadows.addShadowCaster(block, false);
    box("Cube face marking", [1.42, 0.07, 0.045], [x, cubeSize - 0.25, z - cubeSize / 2], cyan);
    for (const edge of [-1, 1]) {
      box("Cube top marking", [1.64, 0.014, 0.054], [x, cubeSize + 0.006, z + edge * 0.82], silver);
    }
  }

  for (const side of [-1, 1]) {
    placedBlock("Arena partition", [0.34, 3.65, puzzle.back - arena.front],
      [side * 4.75, 1.825, (puzzle.back + arena.front) / 2], shell);
    box("Arena partition trim", [0.4, 0.11, puzzle.back - arena.front],
      [side * 4.75, 3.67, (puzzle.back + arena.front) / 2], silver);
    placedBlock("Room divider", [12.15, 4.15, 0.54], [side * 10.775, 2.075, arena.back + 0.1], molding);
    placedBlock("Lift bay wall", [12.15, 4.15, 0.54], [side * 10.775, 2.075, puzzle.back], molding);
  }

  function createBarrier(name: string, width: number, y: number, z: number, trim: StandardMaterial) {
    const root = new TransformNode(name, scene);
    root.position.set(0, y, z);
    for (let index = -5; index <= 5; index++) {
      box("Barrier beam", [0.07, 3.2, 0.07], [index * width * 0.086, 1.59, 0], trim, root);
    }
    for (const side of [-1, 1]) {
      box("Barrier column", [0.24, 3.32, 0.32], [side * (width / 2 - 0.12), 1.66, 0], inset, root);
    }
    const solid = hitbox([width, 3.3, 0.22], [0, y + 1.65, z]);
    return (enabled: boolean) => {
      root.setEnabled(enabled);
      enableBarrier(solid, enabled);
    };
  }

  const setArenaBarrier = createBarrier("Floor arena barrier", 9.5, 0, arena.back + 0.1, red);
  const setPuzzleBarrier = createBarrier("Puzzle barrier", 9.5, 0, puzzle.back, amber);
  const setShelfBarrier = createBarrier("Shelf arena barrier", 9.3, shelf.top, shelf.back, red);

  const crateSize = 1.48;
  const halfCrate = crateSize / 2;
  const bounds = {
    min: new Vector3(-puzzle.halfWidth, 0, puzzle.front + 0.32),
    max: new Vector3(puzzle.halfWidth, crateSize, puzzle.back - 0.16),
  };
  const crates = [-1, 1].map((side) => {
    const x = side * 2.08;
    const color = side < 0 ? amber : cyan;
    const root = new TransformNode(side < 0 ? "Amber crate" : "Cyan crate", scene);
    const block = box("Crate body", [crateSize, crateSize, crateSize], [0, halfCrate, 0], inset, root);
    block.receiveShadows = true;
    shadows.addShadowCaster(block, false);
    box("Crate top", [crateSize - 0.12, 0.07, crateSize - 0.12], [0, crateSize + 0.022, 0], color, root);
    for (const edge of [-1, 1]) {
      box("Crate band", [crateSize - 0.08, 0.22, 0.06], [0, 0.88, edge * halfCrate], color, root);
      box("Crate band", [0.06, 0.22, crateSize - 0.08], [edge * halfCrate, 0.88, 0], color, root);
    }

    const body = hitbox([crateSize, crateSize, crateSize], [x, halfCrate, puzzle.homeZ]);
    const target: Solid = {
      min: new Vector3(x - halfCrate, 0, puzzle.padZ - halfCrate),
      max: new Vector3(x + halfCrate, crateSize, puzzle.padZ + halfCrate),
    };
    const pad = box("Crate target", [1.87, 0.035, 1.87], [x, 0.024, puzzle.padZ], inset);
    const markings = [-1, 1].flatMap((edge) => [
      box("Target border", [1.87, 0.045, 0.095], [x, 0.029, puzzle.padZ + edge * 0.89], color),
      box("Target border", [0.095, 0.045, 1.68], [x + edge * 0.89, 0.029, puzzle.padZ], color),
    ]);
    for (const offset of [-0.28, 0.28]) {
      box("Target center", [0.11, 0.036, 0.83], [x + offset, 0.026, puzzle.padZ], color);
    }
    for (let z = puzzle.homeZ + 1.15; z < puzzle.padZ - 1; z += 0.58) {
      box("Push guide", [0.07, 0.015, 0.26], [x, 0.012, z], color);
    }

    let placed = false;
    function moveTo(cx: number, cz: number) {
      root.position.set(cx, 0, cz);
      body.min.set(cx - halfCrate, 0, cz - halfCrate);
      body.max.set(cx + halfCrate, crateSize, cz + halfCrate);
    }
    function checkTarget(playerOverlaps: (solid: Solid) => boolean) {
      if (placed || Math.hypot(root.position.x - x, root.position.z - puzzle.padZ) > 0.33) return;
      if (playerOverlaps(target) || solids.some((solid) => solid !== body && solidsOverlap(target, solid))) return;
      placed = true;
      moveTo(x, puzzle.padZ);
      pad.material = color;
      for (const marking of markings) marking.material = silver;
    }
    body.push = (axis, distance) => {
      if (placed) return 0;
      const travel = pushSolid(body, solids, bounds, axis, distance);
      root.position[axis] += travel;
      return travel;
    };
    moveTo(x, puzzle.homeZ);
    return {
      get placed() { return placed; },
      get moved() { return root.position.x !== x || root.position.z !== puzzle.homeZ; },
      checkTarget,
      reset() {
        placed = false;
        moveTo(x, puzzle.homeZ);
        pad.material = inset;
        for (const marking of markings) marking.material = color;
      },
    };
  });

  const liftPlatform = box("Elevator platform", [lift.width, 0.22, lift.depth], [0, -0.11, lift.z], slab);
  liftPlatform.receiveShadows = true;
  const liftSolid = hitbox([lift.width, 0.22, lift.depth], [0, -0.11, lift.z]);
  for (const side of [-1, 1]) {
    box("Elevator edge", [0.14, 0.026, lift.depth - 0.16], [side * 1.49, 0.113, 0], cyan, liftPlatform);
    const x = side * 1.91;
    placedBlock("Elevator track", [0.26, shelf.top + 0.5, 0.48], [x, (shelf.top + 0.5) / 2, lift.z], inset);
    box("Elevator guide", [0.075, shelf.top + 0.35, 0.075], [x, (shelf.top + 0.35) / 2, lift.z - 0.251], cyan);
  }

  const shelfEnd = 47.4;
  const shelfDepth = shelfEnd - shelf.front;
  const shelfCenter = (shelf.front + shelfEnd) / 2;
  const shelfDeck = placedBlock("High shelf", [shelf.halfWidth * 2, 0.78, shelfDepth],
    [0, shelf.top - 0.39, shelfCenter], slab);
  shadows.addShadowCaster(shelfDeck, false);
  box("Shelf fascia", [9.3, 0.2, 0.08], [0, shelf.top - 0.47, shelf.front - 0.046], amber);
  for (const side of [-1, 1]) {
    for (const z of [shelf.front + 0.33, shelfEnd - 0.35]) {
      placedBlock("Shelf upright", [0.5, shelf.top + 1.15, 0.52],
        [side * 4.46, (shelf.top + 1.15) / 2, z], shell);
    }
    box("Shelf stringer", [0.27, 0.33, shelfDepth], [side * 4.48, 5.5, shelfCenter], shell);
    box("Shelf edge", [0.08, 0.023, shelfDepth - 0.4], [side * 4.39, shelf.top + 0.011, shelfCenter], cyan);
  }

  for (const side of [-1, 1]) {
    const wallWidth = shelf.halfWidth - 1.3;
    const x = side * (1.3 + wallWidth / 2);
    placedBlock("Door wall", [wallWidth, 3.5, 0.74], [x, goal.y + 1.75, gateZ], shell);
    box("Door jamb", [0.15, 2.85, 0.095], [side * 1.37, goal.y + 1.41, gateZ - 0.415], silver);
    box("Wall trim", [0.045, 2.35, 0.06], [side * 3.69, goal.y + 1.26, gateZ - 0.39], amber);
  }
  placedBlock("Door header", [2.6, 0.76, 0.74], [0, goal.y + 3.12, gateZ], inset);
  const doorLeaves = [-1, 1].map((side) => {
    const root = new TransformNode("Sliding door leaf", scene);
    root.position.set(side * 0.65, goal.y, gateZ);
    box("Door panel", [1.29, 2.76, 0.34], [0, 1.38, 0], slab, root);
    box("Door inlay", [0.9, 2.36, 0.06], [0, 1.38, -0.185], inset, root);
    box("Door center light", [0.065, 2.26, 0.06], [-side * 0.37, 1.38, -0.22], amber, root);
    return root;
  });
  const doorSolid = hitbox([2.6, 2.75, 0.36], [0, goal.y + 1.375, gateZ]);
  const starLights = [-0.5, 0, 0.5].map((x) => {
    const light = box("Star indicator", [0.22, 0.22, 0.09], [x, goal.y + 3.17, gateZ - 0.4], darkLight);
    light.rotation.z = Math.PI / 4;
    return light;
  });
  const goalRing = CreateTorus("Exit pad", { diameter: 1.88, thickness: 0.095, tessellation: 40 }, scene);
  goalRing.position.copyFrom(goal).y += 0.055;
  goalRing.material = cyan;

  const coinPositions: XYZ[] = [
    [0, 0, 1.35], [0.3, 0, 2.6],
    ...blocks.map(([x, z]): XYZ => [x, cubeSize, z]),
    [0, 0, 16.5], [0, 0, 18.1], [0, 0, 21.65],
    [0, 0, 24.45], [0, 0, 25.95], [0, 0, 28.15], [0, 0, 30.6], [0, 0, 32.45],
    [0, shelf.top, 36.35], [0, shelf.top, 38.25], [0, shelf.top, 40.9],
    [0, shelf.top, 42.9], [0, shelf.top, 44.75], [0, shelf.top, 45.65],
  ];
  const coins = coinPositions.map(([x, y, z]) => {
    const position = new Vector3(x, y + 0.73, z);
    const coin = new TransformNode("Coin", scene);
    coin.position.copyFrom(position);
    const disc = CreateCylinder("Gold rim", { height: 0.115, diameter: 0.47, tessellation: 18 }, scene);
    disc.parent = coin;
    disc.rotation.x = Math.PI / 2;
    disc.material = gold;
    const face = CreateCylinder("Gold face", { height: 0.127, diameter: 0.34, tessellation: 18 }, scene);
    face.parent = coin;
    face.rotation.x = Math.PI / 2;
    face.material = goldFace;
    return { coin, position };
  });

  return {
    coins, crates, setArenaBarrier, setPuzzleBarrier, setShelfBarrier,
    moveLift(y: number) {
      liftPlatform.position.y = y - 0.11;
      liftSolid.min.y = y - 0.22;
      liftSolid.max.y = y;
    },
    setDoor(open: number, stars: number) {
      enableBarrier(doorSolid, open < 0.95);
      doorLeaves[0].position.x = -0.65 - open * 1.31;
      doorLeaves[1].position.x = 0.65 + open * 1.31;
      for (const [index, light] of starLights.entries()) light.material = index < stars ? amber : darkLight;
    },
  };
}
