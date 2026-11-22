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
import { arenas, coinSpots, crateCourses, decks, gate, goal, hazard, jumpBlocks, lifts, room, ziplines, type XYZ } from "./route";

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

  const roomDepth = room.back - room.front;
  const roomCenter = (room.back + room.front) / 2;

  const floor = material("Room floor", "#9A847A");
  const wall = material("Room walls", "#9DA8AC");
  const molding = material("Skirting", "#556B79");
  const wood = material("Furniture wood", "#977057");
  const woodEdge = material("Furniture edges", "#684C44");
  placedBlock("Room floor", [room.halfWidth * 2, 0.8, roomDepth], [0, -0.4, roomCenter], floor);
  for (const z of [room.front, room.back]) {
    placedBlock("End wall", [room.halfWidth * 2 + 1, room.height, 0.65], [0, room.height / 2, z], wall);
  }
  box("Back molding", [room.halfWidth * 2, 1.25, 0.3], [0, 0.625, room.back - 0.49], molding);
  const planks: Vector3[][] = [];
  for (let x = -room.halfWidth; x < room.halfWidth; x += 2) {
    planks.push([new Vector3(x, 0.003, room.front), new Vector3(x, 0.003, room.back)]);
    for (let z = room.front + 3 + (x % 4 === 0 ? 3 : 0); z < room.back; z += 8) {
      planks.push([new Vector3(x, 0.003, z), new Vector3(x + 2, 0.003, z)]);
    }
  }
  const seams = CreateLineSystem("Floor seams", { lines: planks }, scene);
  seams.color = Color3.FromHexString("#624F56");
  seams.alpha = 0.55;

  for (const side of [-1, 1]) {
    placedBlock("Side wall", [0.7, room.height, roomDepth], [side * room.halfWidth, room.height / 2, roomCenter], wall);
    box("Side molding", [0.27, 1.25, roomDepth], [side * (room.halfWidth - 0.47), 0.625, roomCenter], molding);
    for (let z = 3; z < room.back; z += 16) {
      box("Wall panel seam", [0.055, 27, 0.1], [side * (room.halfWidth - 0.38), 15, z], molding);
      box("Wall light", [0.14, 0.28, 5.5], [side * (room.halfWidth - 0.42), 24.5, z + 5], silver);
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
  for (let z = 16; z < room.back; z += 26) {
    box("Overhead beam", [room.halfWidth * 2, 0.45, 0.77], [0, 28.3, z], molding);
    box("Overhead strip", [18, 0.14, 0.34], [0, 28, z], silver);
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
  const hazardWidth = room.halfWidth * 2 - 0.69;
  box("Dangerous floor", [hazardWidth, 0.026, hazard.back - hazard.front],
    [0, 0.018, (hazard.front + hazard.back) / 2], danger).receiveShadows = true;
  for (const z of [hazard.front + 0.085, hazard.back - 0.085]) {
    box("Hazard boundary", [hazardWidth, 0.033, 0.1], [0, 0.044, z], dangerGrid);
    for (let x = -26; x <= 26; x += 1.25) {
      box("Warning stripe", [0.7, 0.035, 0.18], [x, 0.044, z + (z < hazard.front + 1 ? 0.27 : -0.27)], dangerGrid)
        .rotation.y = -0.48;
    }
  }
  const hazardLines: Vector3[][] = [];
  for (let x = -27.2; x <= 27.3; x += 1.6) {
    hazardLines.push([new Vector3(x, 0.034, hazard.front), new Vector3(x, 0.034, hazard.back)]);
  }
  for (let z = hazard.front + 1.55; z < hazard.back; z += 1.55) {
    hazardLines.push([new Vector3(-hazardWidth / 2, 0.034, z), new Vector3(hazardWidth / 2, 0.034, z)]);
  }
  const hazardMesh = CreateLineSystem("Danger floor grid", { lines: hazardLines }, scene);
  hazardMesh.color = Color3.FromHexString("#F08A75");
  hazardMesh.alpha = 0.43;

  for (const [x, top, z] of jumpBlocks) {
    const upper = top > 2;
    const size = upper ? 2.28 : 1.95;
    const height = upper ? size : top;
    const block = placedBlock("Jump cube", [size, height, size], [x, top - height / 2, z], slab);
    shadows.addShadowCaster(block, false);
    box("Cube face marking", [size - 0.4, 0.07, 0.045], [x, top - 0.25, z - size / 2], cyan);
    for (const edge of [-1, 1]) {
      box("Cube top marking", [size - 0.24, 0.014, 0.054], [x, top + 0.006, z + edge * (size / 2 - 0.15)], silver);
    }
    if (upper) {
      const supportHeight = top - height;
      box("Bridge platform support", [0.6, supportHeight, 0.65], [x, supportHeight / 2, z], shell);
    }
  }

  function createBarrier(name: string, width: number, x: number, y: number, z: number, trim: StandardMaterial) {
    const root = new TransformNode(name, scene);
    root.position.set(x, y, z);
    const intervals = Math.ceil(width / 0.76);
    for (let index = 1; index < intervals; index++) {
      box("Barrier beam", [0.07, 3.2, 0.07], [(index / intervals - 0.5) * width, 1.59, 0], trim, root);
    }
    for (const side of [-1, 1]) {
      box("Barrier column", [0.24, 3.32, 0.32], [side * (width / 2 - 0.12), 1.66, 0], inset, root);
    }
    const solid = hitbox([width, 3.3, 0.22], [x, y + 1.65, z]);
    return (enabled: boolean) => {
      root.setEnabled(enabled);
      enableBarrier(solid, enabled);
    };
  }

  function groundPassage(z: number) {
    const x = crateCourses[0].x;
    const width = 7;
    for (const side of [-1, 1]) {
      const edge = x + side * width / 2;
      const wallX = side * room.halfWidth;
      const span = Math.abs(wallX - edge);
      placedBlock("Workshop divider", [span, 3.75, 0.68], [(edge + wallX) / 2, 1.875, z], shell);
      box("Workshop divider trim", [span, 0.08, 0.71], [(edge + wallX) / 2, 3.32, z], silver);
    }
    return { x, width };
  }

  const fightBarriers = arenas.map((arena) => {
    const opening = arena.top === 0 ? groundPassage(arena.back) : { x: arena.x, width: 2 * arena.halfWidth + 0.95 };
    return createBarrier("Arena barrier", opening.width, opening.x, arena.top, arena.back, red);
  });

  const violet = material("Violet cargo LEDs", "#BF8DF5", 0.52);
  const green = material("Lime cargo LEDs", "#BCDF63", 0.52);
  const crateColors = [amber, cyan, violet, green];
  const crateSize = 1.48;
  const halfCrate = crateSize / 2;
  const cargo = crateCourses.map((course) => {
    const { x, z, top, halfWidth, front, back } = course;
    const opening = top === 0 ? groundPassage(back) : { x, width: halfWidth * 2 + 0.95 };
    const setBarrier = createBarrier("Cargo barrier", opening.width, opening.x, top, back, amber);
    const bounds = {
      min: new Vector3(x - halfWidth, top, front + 0.23),
      max: new Vector3(x + halfWidth, top + crateSize, back - 0.16),
    };
    for (const side of [-1, 1]) {
      placedBlock("Cargo sidewall", [0.32, 2.8, back - front],
        [x + side * (halfWidth + 0.16), top + 1.4, (back + front) / 2], shell);
      box("Cargo sideline", [0.08, 0.024, back - front],
        [x + side * (halfWidth - 0.12), top + 0.012, (back + front) / 2], amber);
    }
    for (const obstacle of course.obstacles) {
      const obstacleX = x + obstacle.x;
      const obstacleZ = z + obstacle.z;
      placedBlock("Cargo obstacle", [obstacle.width, 2.1, obstacle.depth], [obstacleX, top + 1.05, obstacleZ], shell);
      box("Cargo obstacle trim", [obstacle.width - 0.12, 0.08, obstacle.depth - 0.12], [obstacleX, top + 2.11, obstacleZ], silver);
      for (const side of [-1, 1]) {
        box("Obstacle bumper", [obstacle.width - 0.08, 0.15, 0.06],
          [obstacleX, top + 0.34, obstacleZ + side * obstacle.depth / 2], inset);
      }
    }

    const crates = course.crates.map(({ home, target }, index) => {
      const [homeX, homeZ] = [x + home[0], z + home[1]];
      const [padX, padZ] = [x + target[0], z + target[1]];
      const color = crateColors[index];
      const root = new TransformNode("Cargo crate", scene);
      const block = box("Crate body", [crateSize, crateSize, crateSize], [0, halfCrate, 0], inset, root);
      block.receiveShadows = true;
      shadows.addShadowCaster(block, false);
      box("Crate top panel", [1.27, 0.06, 1.29], [0, crateSize + 0.006, 0], shell, root);
      for (const edge of [-1, 1]) {
        box("Crate band", [crateSize - 0.08, 0.22, 0.06], [0, 0.88, edge * halfCrate], color, root);
        box("Crate band", [0.06, 0.22, crateSize - 0.08], [edge * halfCrate, 0.88, 0], color, root);
      }

      const body = hitbox([crateSize, crateSize, crateSize], [homeX, top + halfCrate, homeZ]);
      const destination: Solid = {
        min: new Vector3(padX - halfCrate, top, padZ - halfCrate),
        max: new Vector3(padX + halfCrate, top + crateSize, padZ + halfCrate),
      };
      const pad = box("Crate target", [1.94, 0.035, 1.94], [padX, top + 0.024, padZ], inset);
      const markings = [-1, 1].flatMap((edge) => [
        box("Target border", [1.94, 0.045, 0.095], [padX, top + 0.029, padZ + edge * 0.92], color),
        box("Target border", [0.095, 0.045, 1.75], [padX + edge * 0.92, top + 0.029, padZ], color),
      ]);
      for (let bar = 0; bar <= index; bar++) {
        const offset = (bar - index / 2) * 0.25;
        box("Crate symbol", [0.12, 0.024, 0.67], [offset, crateSize + 0.045, 0], color, root);
        markings.push(box("Target symbol", [0.12, 0.019, 0.67], [padX + offset, top + 0.048, padZ], color));
      }

      let placed = false;
      function moveTo(cx: number, cz: number) {
        root.position.set(cx, top, cz);
        body.min.set(cx - halfCrate, top, cz - halfCrate);
        body.max.set(cx + halfCrate, top + crateSize, cz + halfCrate);
      }
      function checkTarget(playerOverlaps: (solid: Solid) => boolean) {
        if (placed || Math.hypot(root.position.x - padX, root.position.z - padZ) > 0.34) return;
        if (playerOverlaps(destination) || solids.some((solid) => solid !== body && solidsOverlap(destination, solid))) return;
        placed = true;
        moveTo(padX, padZ);
        pad.material = color;
        for (const marking of markings) marking.material = silver;
      }
      body.push = (axis, distance) => {
        if (placed) return 0;
        const travel = pushSolid(body, solids, bounds, axis, distance);
        root.position[axis] += travel;
        return travel;
      };
      moveTo(homeX, homeZ);
      return {
        get placed() { return placed; },
        get moved() { return root.position.x !== homeX || root.position.z !== homeZ; },
        checkTarget,
        reset() {
          placed = false;
          moveTo(homeX, homeZ);
          pad.material = inset;
          for (const marking of markings) marking.material = color;
        },
      };
    });
    return { crates, setBarrier };
  });

  const elevatorPlatforms = lifts.map(({ x, z, lower, upper, width, depth }) => {
    const center: XYZ = [x, lower - 0.11, z];
    const size: XYZ = [width, 0.22, depth];
    const platform = box("Elevator platform", size, center, slab);
    platform.receiveShadows = true;
    const solid = hitbox(size, center);
    const trackHeight = upper - lower + 0.5;
    for (const side of [-1, 1]) {
      box("Elevator edge", [0.16, 0.027, depth - 0.18], [side * (width / 2 - 0.19), 0.114, 0], cyan, platform);
      const trackX = x + side * (width / 2 + 0.19);
      placedBlock("Elevator track", [0.26, trackHeight, 0.48], [trackX, lower + trackHeight / 2, z], inset);
      box("Elevator guide", [0.075, trackHeight - 0.15, 0.075], [trackX, lower + trackHeight / 2, z - 0.251], cyan);
    }
    return {
      move(y: number) {
        platform.position.y = y - 0.11;
        solid.min.y = y - 0.22;
        solid.max.y = y;
      },
    };
  });

  for (const { name, x, width, front, back, top } of decks) {
    const depth = back - front;
    const centerZ = (front + back) / 2;
    const size: XYZ = [width, 0.76, depth];
    const center: XYZ = [x, top - size[1] / 2, centerZ];
    const deck = box(name, size, center, slab);
    deck.receiveShadows = true;
    shadows.addShadowCaster(deck, false);
    hitbox(size, center).max.y = top;
    for (const z of [front - 0.04, back + 0.04]) {
      box("Deck fascia", [width, 0.15, 0.08], [x, top - 0.4, z], amber);
    }
    for (const side of [-1, 1]) {
      const edge = x + side * (width / 2 - 0.28);
      for (let z = front + 0.38; z <= back; z += Math.min(13, depth - 0.78)) {
        placedBlock("Shelf upright", [0.53, top - 0.18, 0.56], [edge, (top - 0.18) / 2, z], shell);
      }
      box("Shelf stringer", [0.28, 0.33, depth], [edge, top - 1.15, centerZ], shell);
      box("Deck edge", [0.09, 0.026, depth - 0.28], [edge, top + 0.012, centerZ], cyan);
    }
  }

  function cableSegment(name: string, start: Vector3, end: Vector3, thickness: number, surface: StandardMaterial) {
    const delta = end.subtract(start);
    const center = Vector3.Center(start, end);
    const segment = box(name, [thickness, thickness, delta.length()], [center.x, center.y, center.z], surface);
    segment.rotation.set(-Math.atan2(delta.y, Math.hypot(delta.x, delta.z)), Math.atan2(delta.x, delta.z), 0);
  }

  const zipGrips = ziplines.map(({ start, end }) => {
    const cableHeight = 2.4;
    const cableStart = start.add(new Vector3(0, cableHeight, 0));
    const cableEnd = end.add(new Vector3(0, cableHeight, 0));
    cableSegment("Zipline cable", cableStart, cableEnd, 0.1, amber);
    const across = new Vector3(end.z - start.z, 0, start.x - end.x).normalize().scale(1.24);
    for (const point of [start, end]) {
      const a = point.add(across);
      const b = point.subtract(across);
      placedBlock("Zipline gantry", [0.24, 2.67, 0.24], [a.x, a.y + 1.335, a.z], inset);
      placedBlock("Zipline gantry", [0.24, 2.67, 0.24], [b.x, b.y + 1.335, b.z], inset);
      a.y += cableHeight + 0.12;
      b.y += cableHeight + 0.12;
      cableSegment("Zipline gantry crossbar", a, b, 0.22, shell);
      const marker = CreateTorus("Zipline platform marker", { diameter: 1.33, thickness: 0.055, tessellation: 28 }, scene);
      marker.position.copyFrom(point).y += 0.027;
      marker.material = amber;
    }
    const grip = new TransformNode("Zipline trolley", scene);
    box("Zipline pulley", [0.28, 0.2, 0.24], [0, cableHeight, 0], silver, grip);
    box("Zipline hanger", [0.08, 0.68, 0.08], [0, cableHeight - 0.34, 0], inset, grip);
    box("Zipline grip", [0.57, 0.09, 0.12], [0, cableHeight - 0.68, 0], cyan, grip);
    grip.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    return grip;
  });

  for (const point of [arenas[0].checkpoint, arenas[1].checkpoint, lifts[1].arrival, arenas[2].checkpoint]) {
    const marker = CreateTorus("Checkpoint", { diameter: 1.56, thickness: 0.055, tessellation: 28 }, scene);
    marker.position.copyFrom(point).y += 0.022;
    marker.material = cyan;
  }

  const doorDeck = decks[decks.length - 1];
  for (const side of [-1, 1]) {
    const wallWidth = doorDeck.width / 2 - 1.3 + 0.48;
    const x = gate.x + side * (1.3 + wallWidth / 2);
    placedBlock("Door wall", [wallWidth, 4.25, 0.74], [x, gate.y + 2.125, gate.z], shell);
    box("Door jamb", [0.15, 2.85, 0.095], [gate.x + side * 1.37, gate.y + 1.41, gate.z - 0.415], silver);
    box("Wall trim", [0.045, 2.35, 0.06], [gate.x + side * 3.69, gate.y + 1.26, gate.z - 0.39], amber);
  }
  placedBlock("Door header", [2.6, 1.49, 0.74], [gate.x, gate.y + 3.505, gate.z], inset);
  const doorLeaves = [-1, 1].map((side) => {
    const root = new TransformNode("Sliding door leaf", scene);
    root.position.set(gate.x + side * 0.65, gate.y, gate.z);
    box("Door panel", [1.29, 2.76, 0.34], [0, 1.38, 0], slab, root);
    box("Door inlay", [0.9, 2.36, 0.06], [0, 1.38, -0.185], inset, root);
    box("Door center light", [0.065, 2.26, 0.06], [-side * 0.37, 1.38, -0.22], amber, root);
    return root;
  });
  const doorSolid = hitbox([2.6, 2.76, 0.36], [gate.x, gate.y + 1.38, gate.z]);
  const starLights = [-0.5, 0, 0.5].map((x) => {
    const light = box("Star indicator", [0.22, 0.22, 0.09], [gate.x + x, gate.y + 3.17, gate.z - 0.4], darkLight);
    light.rotation.z = Math.PI / 4;
    return light;
  });
  const goalRing = CreateTorus("Exit pad", { diameter: 1.88, thickness: 0.095, tessellation: 40 }, scene);
  goalRing.position.copyFrom(goal).y += 0.055;
  goalRing.material = cyan;

  const coins = coinSpots.map(([x, y, z]) => {
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
    coins, cargo, fightBarriers, elevatorPlatforms, zipGrips,
    setDoor(open: number, stars: number) {
      enableBarrier(doorSolid, open < 0.95);
      doorLeaves[0].position.x = gate.x - 0.65 - open * 1.31;
      doorLeaves[1].position.x = gate.x + 0.65 + open * 1.31;
      for (const [index, light] of starLights.entries()) light.material = index < stars ? amber : darkLight;
    },
  };
}
