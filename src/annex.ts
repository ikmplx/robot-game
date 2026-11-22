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
import { bossArena, maze, type XYZ } from "./route";

export function createAnnex(scene: Scene, workshop: Workshop, solids: Solid[]) {
  const { box, material, shadows } = workshop;
  const stone = material("Twilight stone", "#354155");
  const cap = material("Maze wall cap", "#52677F");
  const tile = material("Slate tile", "#59697B");
  const alternateTile = material("Blue slate tile", "#4D5F75");
  const metal = material("Arena brass", "#B98652");
  const wax = material("Candle wax", "#E9BA76");
  const wick = material("Candle wick", "#53402C");
  const flameColor = material("Candle flame", "#FFC063", 0.95);
  const flameCore = material("Candle flame core", "#FFF1BA", 1);
  const amber = material("Lantern glass", "#FFC673", 0.58);
  flameColor.disableLighting = true;
  flameCore.disableLighting = true;
  for (const surface of [stone, cap, tile, alternateTile]) surface.maxSimultaneousLights = 6;

  const { x, top, halfWidth, cell, front, back, rows } = maze;
  const minX = x - halfWidth;
  const mazeMeshes = new Set<AbstractMesh>();
  const surfaces: { mesh: AbstractMesh; wall: boolean }[] = [];
  const candleRange = cell * 2.35;
  const entranceRange = cell * 3.1;
  let scoutMeshes: AbstractMesh[] = [];

  function mazeSurface(mesh: AbstractMesh, wall: boolean) {
    mazeMeshes.add(mesh);
    surfaces.push({ mesh, wall });
  }

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

  const wallHeight = 2.96;
  for (const side of [-1, 1]) {
    const wallX = x + side * (halfWidth + 0.13);
    solidBlock("Annex side wall", [0.32, wallHeight, 69], [wallX, top + wallHeight / 2, 257.5], stone);
    box("Annex upper trim", [0.42, 0.11, 69], [wallX, top + wallHeight - 0.06, 257.5], cap);
  }

  function grille(name: string, z: number, width: number) {
    const root = new TransformNode(name, scene);
    root.position.set(x, top, z);
    const barCount = Math.ceil(width / 0.33);
    for (let i = 0; i <= barCount; i++) {
      box("Portcullis bar", [0.08, 2.96, 0.13], [width * (i / barCount - 0.5), 1.48, 0], metal, root);
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

  for (const side of [-1, 1]) {
    mazeSurface(box("Maze exit jamb", [0.25, 2.95, 0.45],
      [x + side * (cell / 2 - 0.06), top + 1.475, back - 0.28], metal), false);
  }
  mazeSurface(box("Maze exit lintel", [cell + 0.19, 0.26, 0.45], [x, top + 2.82, back - 0.28], metal), false);

  function arenaGate(name: string, z: number, opening: number) {
    for (const side of [-1, 1]) {
      const width = halfWidth - opening / 2;
      solidBlock("Arena buttress", [width, 3.15, 0.6],
        [x + side * (opening + width) / 2, top + 1.575, z], stone);
    }
    return grille(name, z, opening);
  }
  const setArenaEntrance = arenaGate("Arena entrance grille", bossArena.front, 6.8);
  const setArenaExit = arenaGate("Guardian grille", bossArena.back, 3.5);
  solidBlock("Annex end wall", [halfWidth * 2, 3, 0.52], [x, top + 1.5, 291.85], stone);

  const slots: { position: Vector3; entrance: boolean }[] = [];
  for (const [rowIndex, row] of rows.entries()) {
    const z = front + (rowIndex + 0.5) * cell;
    for (const [column, kind] of [...row].entries()) {
      const px = minX + (column + 0.5) * cell;
      if (kind === "#") {
        const wall = solidBlock("Maze block", [cell, wallHeight, cell], [px, top + wallHeight / 2, z], stone);
        const edge = box("Maze block cap", [cell - 0.08, 0.1, cell - 0.08], [px, top + wallHeight - 0.02, z], cap);
        mazeSurface(wall, true);
        mazeSurface(edge, true);
      } else {
        const surface = (column + rowIndex) % 2 ? tile : alternateTile;
        mazeSurface(box("Maze slate tile", [cell - 0.025, 0.026, cell - 0.025], [px, top + 0.006, z], surface), false);
        if (kind !== ".") {
          const entrance = kind === "A";
          slots.push({ position: new Vector3(px, top, entrance ? front + 1.95 : z), entrance });
        }
      }
    }
  }
  function cellAt(x: number, z: number) {
    return rows[Math.floor((z - front) / cell)]?.[Math.floor((x - minX) / cell)];
  }

  function pathClear(from: Vector3, to: Vector3) {
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.16);
    for (let i = 1; i < steps; i++) {
      if (cellAt(from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps) === "#") return false;
    }
    return true;
  }

  const cardinal = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function receivesCandleLight(position: Vector3, surface: Vector3, wall: boolean, range: number) {
    if (Math.hypot(position.x - surface.x, position.z - surface.z) > range + cell / 2) return false;
    if (!wall) return pathClear(position, surface);
    return cardinal.some(([dx, dz]) => {
      const face = new Vector3(surface.x + dx * (cell / 2 + 0.08), top, surface.z + dz * (cell / 2 + 0.08));
      const passage = cellAt(face.x, face.z);
      return passage && passage !== "#" && pathClear(position, face);
    });
  }

  const candles = slots.map(({ position, entrance }, index) => {
    const pedestal = entrance ? 0.56 : 0.32;
    const base = CreateCylinder("Candle holder", { diameter: entrance ? 0.83 : 0.61, height: pedestal, tessellation: 18 }, scene);
    base.position.copyFrom(position).y += pedestal / 2;
    base.material = metal;
    const candle = CreateCylinder("Wax candle", { diameter: entrance ? 0.37 : 0.28, height: 0.58, tessellation: 16 }, scene);
    candle.position.copyFrom(position).y += pedestal + 0.29;
    candle.material = wax;
    const wickMesh = box("Candle wick", [0.052, 0.14, 0.052], [position.x, top + pedestal + 0.6, position.z], wick);
    for (const mesh of [base, candle, wickMesh]) mazeSurface(mesh, false);
    const fire = new TransformNode("Candle flame", scene);
    fire.position.copyFrom(position).y += pedestal + 0.76;
    const outer = CreateSphere("Flame body", { diameter: 0.32, segments: 8 }, scene);
    outer.parent = fire;
    outer.scaling.set(0.68, 1.43, 0.68);
    outer.material = flameColor;
    const inner = CreateSphere("Flame core", { diameter: 0.18, segments: 8 }, scene);
    inner.parent = fire;
    inner.position.y = -0.07;
    inner.scaling.y = 1.45;
    inner.material = flameCore;
    mazeMeshes.add(outer);
    mazeMeshes.add(inner);
    const point = new PointLight("Candle pool of light", new Vector3(position.x, top + pedestal + 0.92, position.z), scene);
    point.diffuse = Color3.FromHexString("#FFAD59");
    point.range = entrance ? entranceRange : candleRange;
    return { position, fire, point, index, entrance, lit: entrance, surfaces: [] as AbstractMesh[], reachesScout: false };
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
  function contains(position: Vector3) {
    return position.z >= front && position.z < back && Math.abs(position.x - x) < halfWidth
      && Math.abs(position.y - top) < 2.7;
  }

  return {
    contains, mazeMeshes,
    setArenaEntrance, setArenaExit,
    lightScout(meshes: AbstractMesh[]) {
      scoutMeshes = meshes;
      const worldSurfaces = surfaces.map(({ mesh, wall }) => {
        mesh.computeWorldMatrix(true);
        return { mesh, wall, center: mesh.getAbsolutePosition().clone() };
      });
      for (const candle of candles) {
        const { position, point } = candle;
        candle.surfaces = worldSurfaces
          .filter(({ center, wall }) => receivesCandleLight(position, center, wall, point.range))
          .map(({ mesh }) => mesh);
        point.includedOnlyMeshes = [...candle.surfaces];
      }
    },
    strike(from: Vector3, inReach: (target: Vector3, range: number) => boolean) {
      if (!contains(from)) return false;
      let changed = false;
      for (const candle of candles) {
        const { position } = candle;
        if (candle.lit || !inReach(position, 2.12) || !pathClear(from, position)) continue;
        candle.lit = true;
        changed = true;
      }
      return changed;
    },
    draw(clock: number, scout: Vector3, nearby: boolean) {
      let scoutLit = false;
      for (const candle of candles) {
        const { lit, fire, point, index, entrance, position } = candle;
        fire.setEnabled(lit);
        const reachesScout = lit && nearby
          && Math.hypot(position.x - scout.x, position.z - scout.z) < point.range
          && pathClear(position, scout);
        if (candle.reachesScout !== reachesScout) {
          candle.reachesScout = reachesScout;
          point.includedOnlyMeshes = reachesScout ? [...candle.surfaces, ...scoutMeshes] : [...candle.surfaces];
        }
        scoutLit ||= reachesScout;
        if (point.isEnabled() !== (lit && nearby)) point.setEnabled(lit && nearby);
        if (!lit || !nearby) continue;
        const flicker = Math.sin(clock * 16 + index * 2.6) + 0.44 * Math.sin(clock * 23 + index);
        fire.scaling.y = 1 + flicker * 0.075;
        fire.rotation.z = flicker * 0.12;
        point.intensity = (entrance ? 4.9 : 3.5) + flicker * 0.24;
      }
      return scoutLit;
    },
    reset() {
      for (const candle of candles) {
        candle.lit = candle.entrance;
        candle.fire.setEnabled(candle.entrance);
        candle.point.setEnabled(false);
      }
      setArenaEntrance(true);
      setArenaExit(false);
    },
  };
}
