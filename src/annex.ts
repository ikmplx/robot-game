import { PointLight } from "@babylonjs/core/Lights/pointLight";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import type { Solid } from "./platformer";
import { bossArena, goal, maze, type XYZ } from "./route";

export function createAnnex(scene: Scene, workshop: Workshop, solids: Solid[]) {
  const { box, material, shadows } = workshop;
  const stone = material("Twilight stone", "#354155");
  const cap = material("Maze wall cap", "#52677F");
  const tile = material("Slate tile", "#59697B");
  const alternateTile = material("Blue slate tile", "#4D5F75");
  const metal = material("Arena brass", "#B98652");
  const wax = material("Candle wax", "#E9BA76", 0.21);
  const wick = material("Candle wick", "#B69564", 0.48);
  const flameColor = material("Candle flame", "#FFC063", 0.95);
  const flameCore = material("Candle flame core", "#FFF1BA", 1);
  const amber = material("Lantern glass", "#FFC673", 0.58);
  const teal = material("Exit inlay", "#75E5D2", 0.62);
  flameColor.disableLighting = true;
  flameCore.disableLighting = true;
  for (const surface of [stone, cap, tile, alternateTile]) surface.maxSimultaneousLights = 6;

  const { x, top, halfWidth, cell, front, back, rows } = maze;
  const minX = x - halfWidth;
  const litMeshes: AbstractMesh[] = [];
  let litCount = 0;

  function solidBlock(name: string, size: XYZ, center: XYZ, surface: StandardMaterial) {
    const mesh = box(name, size, center, surface);
    mesh.receiveShadows = true;
    const bounds = new Vector3(...size).scale(0.5);
    solids.push({ min: mesh.position.subtract(bounds), max: mesh.position.add(bounds) });
    return mesh;
  }

  const floor = solidBlock("Annex foundation", [halfWidth * 2, 0.8, 69], [x, top - 0.4, 257.5], stone);
  solids[solids.length - 1].max.y = top;
  shadows.addShadowCaster(floor, false);
  litMeshes.push(floor);

  const wallHeight = 2.96;
  for (const side of [-1, 1]) {
    const wallX = x + side * (halfWidth + 0.13);
    litMeshes.push(solidBlock("Annex side wall", [0.32, wallHeight, 69],
      [wallX, top + wallHeight / 2, 257.5], stone));
    box("Annex upper trim", [0.42, 0.11, 69], [wallX, top + wallHeight - 0.06, 257.5], cap);
  }

  function grille(name: string, z: number, width: number, surface: StandardMaterial) {
    const root = new TransformNode(name, scene);
    root.position.set(x, top, z);
    const barCount = Math.ceil(width / 0.33);
    for (let i = 0; i <= barCount; i++) {
      box("Portcullis bar", [0.08, 2.96, 0.13], [width * (i / barCount - 0.5), 1.48, 0], surface, root);
    }
    for (const h of [0.27, 2.66]) box("Portcullis rail", [width, 0.15, 0.12], [0, h, 0], cap, root);
    const solid: Solid = {
      min: new Vector3(x - width / 2, top, z - 0.1),
      max: new Vector3(x + width / 2, top + 2.96, z + 0.1),
    };
    return (open: boolean) => {
      root.setEnabled(!open);
      const index = solids.indexOf(solid);
      if (open && index >= 0) solids.splice(index, 1);
      if (!open && index < 0) solids.push(solid);
    };
  }

  const setMazeExit = grille("Candle grille", back - 0.33, cell + 0.04, amber);
  function arenaGate(name: string, z: number, opening: number) {
    for (const side of [-1, 1]) {
      const width = halfWidth - opening / 2;
      solidBlock("Arena buttress", [width, 3.15, 0.6],
        [x + side * (opening + width) / 2, top + 1.575, z], stone);
    }
    return grille(name, z, opening, metal);
  }
  const setArenaEntrance = arenaGate("Arena entrance grille", bossArena.front, 6.8);
  const setArenaExit = arenaGate("Guardian grille", bossArena.back, 3.5);
  solidBlock("Annex end wall", [halfWidth * 2, 3, 0.52], [x, top + 1.5, 291.85], stone);

  const slots: Vector3[] = [];
  for (const [rowIndex, row] of rows.entries()) {
    const z = front + (rowIndex + 0.5) * cell;
    let column = 0;
    while (column < row.length) {
      if (row[column] === "#") {
        const start = column++;
        while (row[column] === "#") column++;
        const width = (column - start) * cell;
        const wallX = minX + (start + column) * cell / 2;
        const wall = solidBlock("Maze block", [width, wallHeight, cell], [wallX, top + wallHeight / 2, z], stone);
        const edge = box("Maze block cap", [width - 0.08, 0.1, cell - 0.08], [wallX, top + wallHeight - 0.02, z], cap);
        litMeshes.push(wall, edge);
      } else {
        const px = minX + (column + 0.5) * cell;
        const surface = (column + rowIndex) % 2 ? tile : alternateTile;
        litMeshes.push(box("Maze slate tile", [cell - 0.055, 0.026, cell - 0.055], [px, top + 0.006, z], surface));
        if (row[column] !== ".") slots.push(new Vector3(px, top, z));
        column++;
      }
    }
  }

  const scoutLight = new PointLight("Scout visibility in the dark", Vector3.Zero(), scene);
  scoutLight.diffuse = Color3.FromHexString("#C1D7FF");
  scoutLight.range = 4.6;
  scoutLight.intensity = 0.58;
  scoutLight.includedOnlyMeshes = litMeshes;
  scoutLight.setEnabled(false);

  function pathClear(from: Vector3, to: Vector3) {
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.16);
    for (let i = 1; i < steps; i++) {
      const row = Math.floor((from.z + (to.z - from.z) * i / steps - front) / cell);
      const column = Math.floor((from.x + (to.x - from.x) * i / steps - minX) / cell);
      if (rows[row]?.[column] === "#") return false;
    }
    return true;
  }

  const candles = slots.map((position, index) => {
    const base = CreateCylinder("Candle holder", { diameter: 0.58, height: 0.12, tessellation: 18 }, scene);
    base.position.copyFrom(position).y += 0.06;
    base.material = metal;
    const candle = CreateCylinder("Wax candle", { diameter: 0.29, height: 0.63, tessellation: 16 }, scene);
    candle.position.copyFrom(position).y += 0.39;
    candle.material = wax;
    box("Candle wick", [0.052, 0.14, 0.052], [position.x, top + 0.75, position.z], wick);
    const fire = new TransformNode("Candle flame", scene);
    fire.position.copyFrom(position).y += 0.91;
    const outer = CreateSphere("Flame body", { diameter: 0.32, segments: 8 }, scene);
    outer.parent = fire;
    outer.scaling.set(0.68, 1.43, 0.68);
    outer.material = flameColor;
    const inner = CreateSphere("Flame core", { diameter: 0.18, segments: 8 }, scene);
    inner.parent = fire;
    inner.position.y = -0.07;
    inner.scaling.y = 1.45;
    inner.material = flameCore;
    const point = new PointLight("Candle pool of light", new Vector3(position.x, top + 1.18, position.z), scene);
    point.diffuse = Color3.FromHexString("#FFAD59");
    point.range = 6.8;
    point.includedOnlyMeshes = litMeshes.filter((mesh) => {
      if (mesh === floor) return true;
      if (Math.hypot(mesh.position.x - position.x, mesh.position.z - position.z) > 8.2) return false;
      return !mesh.name.startsWith("Maze slate") || pathClear(position, mesh.position);
    });
    return { position, fire, point, index, lit: false };
  });

  for (const side of [-1, 1]) {
    for (const z of [front - 1, bossArena.front + 1, bossArena.back - 1.2]) {
      const postX = x + side * (z < front ? 2.2 : halfWidth - 0.85);
      box("Lantern pedestal", [0.54, 1.7, 0.54], [postX, top + 0.85, z], stone);
      box("Lantern", [0.36, 0.56, 0.36], [postX, top + 1.94, z], amber);
      box("Lantern hood", [0.54, 0.15, 0.54], [postX, top + 2.27, z], metal);
    }
  }
  for (const diameter of [5.5, 10.8]) {
    const inlay = CreateTorus("Arena inlay", { diameter, thickness: 0.045, tessellation: 54 }, scene);
    inlay.position.copyFrom(bossArena.home).y += 0.03;
    inlay.position.z -= 1.9;
    inlay.material = metal;
  }
  const goalRing = CreateTorus("Exit pad", { diameter: 2.15, thickness: 0.095, tessellation: 40 }, scene);
  goalRing.position.copyFrom(goal).y += 0.055;
  goalRing.material = teal;

  function isDark(position: Vector3) {
    return position.z >= front && position.z < back && Math.abs(position.x - x) < halfWidth
      && Math.abs(position.y - top) < 2.7;
  }

  return {
    isDark,
    get litCount() { return litCount; },
    totalCandles: candles.length,
    setArenaEntrance, setArenaExit,
    strike(from: Vector3, inReach: (target: Vector3, range: number) => boolean) {
      if (!isDark(from)) return false;
      let changed = false;
      for (const candle of candles) {
        const { position } = candle;
        if (candle.lit || !inReach(position, 2.12) || !pathClear(from, position)) continue;
        candle.lit = true;
        litCount++;
        changed = true;
      }
      if (litCount === candles.length) setMazeExit(true);
      return changed;
    },
    draw(position: Vector3, clock: number, dark: boolean) {
      scoutLight.setEnabled(dark);
      scoutLight.position.copyFrom(position).y += 1.28;
      for (const { lit, fire, point, index } of candles) {
        fire.setEnabled(lit);
        point.setEnabled(lit);
        if (!lit) continue;
        const flicker = Math.sin(clock * 16 + index * 2.6) + 0.44 * Math.sin(clock * 23 + index);
        fire.scaling.y = 1 + flicker * 0.075;
        fire.rotation.z = flicker * 0.12;
        point.intensity = 3.05 + flicker * 0.24;
      }
    },
    reset() {
      litCount = 0;
      for (const candle of candles) {
        candle.lit = false;
        candle.fire.setEnabled(false);
        candle.point.setEnabled(false);
      }
      setMazeExit(false);
      setArenaEntrance(true);
      setArenaExit(false);
    },
  };
}
