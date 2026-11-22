import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import type { GameInput } from "./input";
import { createPlayer, type Solid } from "./platformer";
import floorTextureUrl from "./assets/floor.png?no-inline";
import kreaCrateUrl from "./assets/krea-crate.glb?url&no-inline";
import scoutRobotUrl from "./assets/scout-robot.glb?url&no-inline";

async function addScoutRobot(scene: Scene, shadows: ShadowGenerator, player: TransformNode) {
  if (scene.isDisposed) return;

  const model = await LoadAssetContainerAsync(scoutRobotUrl, scene);
  if (scene.isDisposed) {
    model.dispose();
    return;
  }

  const robot = model.createRootMesh();
  robot.name = "Scout robot placement";
  model.addAllToScene();
  robot.parent = player;
  robot.scaling.setAll(0.62);
  robot.rotation.y = Math.PI;
  shadows.addShadowCaster(robot);
}

async function addEquipmentCrate(scene: Scene, shadows: ShadowGenerator, solids: Solid[]) {
  if (scene.isDisposed) return;

  const model = await LoadAssetContainerAsync(kreaCrateUrl, scene);
  if (scene.isDisposed) {
    model.dispose();
    return;
  }

  const crate = model.createRootMesh();
  crate.name = "Equipment crate";
  crate.rotation.y = -0.25;
  const { min, max } = crate.getHierarchyBoundingVectors();
  const size = max.subtract(min);
  const scale = 0.95 / Math.max(size.x, size.y, size.z);
  crate.scaling.setAll(scale);
  crate.position.set(
    1.15 - (min.x + max.x) * scale / 2,
    0.005 - min.y * scale,
    1.5 - (min.z + max.z) * scale / 2,
  );
  model.addAllToScene();
  solids.push(crate.getHierarchyBoundingVectors());
  shadows.addShadowCaster(crate);
}

export function createPlatformerScene(engine: Engine, input: GameInput, status: HTMLElement) {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#101C21FF");

  const camera = new FreeCamera("follow", Vector3.Zero(), scene);
  camera.fov = 0.8;
  camera.minZ = 0.1;

  const fill = new HemisphericLight("fill", new Vector3(0, 1, 0), scene);
  fill.intensity = 0.75;
  fill.groundColor = Color3.FromHexString("#63727B");

  const sun = new DirectionalLight("sun", new Vector3(0.45, -1, 0.4), scene);
  sun.position.set(-7, 12, -7);
  sun.intensity = 1.05;
  sun.shadowMinZ = 0.5;
  sun.shadowMaxZ = 45;
  const shadows = new ShadowGenerator(1024, sun);
  shadows.usePoissonSampling = true;
  shadows.bias = 0.001;
  shadows.setDarkness(0.2);

  function material(name: string, color: string): StandardMaterial {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor.setAll(0.06);
    return result;
  }

  function block(
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    surface: StandardMaterial,
    castsShadow = false,
  ) {
    const [width, height, depth] = size;
    const mesh = CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(...position);
    mesh.material = surface;
    mesh.receiveShadows = true;
    if (castsShadow) shadows.addShadowCaster(mesh);
  }

  const frame = material("dark frame", "#233C42");
  const wall = material("painted wall", "#335258");
  const platform = material("platform surface", "#739C91");
  const accent = material("amber marking", "#E5A347");
  const beacon = material("beacon", "#9FFFD9");
  beacon.disableLighting = true;
  beacon.emissiveColor = Color3.FromHexString("#63E7A9");

  const solids: Solid[] = [];
  function addPlatform(name: string, x: number, z: number, width: number, depth: number, top: number) {
    const height = 0.55;
    block(name, [width, height, depth], [x, top - height / 2, z], platform, true);
    const min = new Vector3(x - width / 2, top - height, z - depth / 2);
    const max = new Vector3(x + width / 2, top, z + depth / 2);
    solids.push({ min, max });
    block(name + " edge", [width - 0.16, 0.075, 0.05], [x, top - 0.085, min.z], accent);
  }

  addPlatform("Start", 0, 0, 5.8, 6, 0);
  addPlatform("Platform 1", 0, 5.3, 3.8, 2.6, 0.42);
  addPlatform("Platform 2", -1.4, 9.05, 3.5, 2.6, 0.87);
  addPlatform("Platform 3", 1.25, 12.8, 3.7, 2.6, 1.32);
  addPlatform("Finish", 0.6, 17, 4.6, 3.8, 1.77);

  const floor = CreateGround("textured floor", { width: 5.8, height: 6 }, scene);
  floor.position.y = 0.005;
  const floorMaterial = material("floor tiles", "#A4B5AE");
  const floorTexture = new Texture(floorTextureUrl, scene);
  floorTexture.uScale = 3;
  floorTexture.vScale = 3;
  floorMaterial.diffuseTexture = floorTexture;
  floor.material = floorMaterial;
  floor.receiveShadows = true;

  block("pit", [18, 0.5, 32], [0, -4.4, 9], frame);
  block("end wall", [13, 8, 0.5], [0, -0.35, 21], wall);
  for (const x of [-5.6, 5.6]) {
    block("pit border", [0.75, 0.7, 27], [x, -2.4, 8.5], frame);
    for (const z of [3, 10, 17]) {
      block("column", [0.85, 6, 0.85], [x, -0.45, z], wall);
    }
  }

  const goal = new Vector3(0.6, 1.77, 17.65);
  const goalRing = CreateTorus("Beacon", { diameter: 1.65, thickness: 0.08, tessellation: 32 }, scene);
  goalRing.position.copyFrom(goal);
  goalRing.position.y += 0.05;
  goalRing.material = beacon;
  block("beacon light", [0.2, 1.6, 0.09], [goal.x, goal.y + 0.8, 18.9], beacon);

  const player = createPlayer(solids, new Vector3(0, 0, 0.25));
  const avatar = new TransformNode("Player", scene);
  const target = Vector3.Zero();
  const cameraDistance = 6.4;
  const cameraHeight = 3.6;
  const cameraFollowRate = 0.85;
  const step = 1 / 120;
  let cameraYaw = 0;
  let accumulator = 0;
  let finished = false;
  let ready = false;

  function reset() {
    player.reset();
    avatar.rotation.y = 0;
    cameraYaw = 0;
    accumulator = 0;
    finished = false;
    status.textContent = "";
    status.hidden = true;
  }

  function updateCamera() {
    const forwardX = Math.sin(cameraYaw);
    const forwardZ = Math.cos(cameraYaw);
    const { x, y, z } = player.position;
    camera.position.set(x - forwardX * cameraDistance, y + cameraHeight, z - forwardZ * cameraDistance);
    target.set(x + forwardX * 2.5, y + 0.75, z + forwardZ * 2.5);
    camera.setTarget(target);
  }

  updateCamera();
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (ready && input.takeRestart()) reset();
    if (ready && !finished) {
      const { x: strafe, z: forward } = input.movement();
      if (input.takeJump()) player.queueJump();
      accumulator += dt;
      while (accumulator >= step) {
        accumulator -= step;
        const sin = Math.sin(cameraYaw);
        const cos = Math.cos(cameraYaw);
        const previousX = player.position.x;
        const previousZ = player.position.z;
        player.update(step, strafe * cos + forward * sin, forward * cos - strafe * sin);
        const dx = player.position.x - previousX;
        const dz = player.position.z - previousZ;
        if (dx || dz) {
          avatar.rotation.y = Math.atan2(dx, dz);
          const turn = avatar.rotation.y - cameraYaw;
          const shortestTurn = Math.atan2(Math.sin(turn), Math.cos(turn));
          // Directly backward has two equal turns. Pick one to avoid jitter.
          const cameraTurn = Math.PI - Math.abs(shortestTurn) < 1e-8 ? Math.PI : shortestTurn;
          cameraYaw += cameraTurn * (1 - Math.exp(-cameraFollowRate * step));
        }
        if (player.position.y < -3.9) {
          reset();
          break;
        }
        if (player.grounded && player.position.y === goal.y
          && Math.hypot(player.position.x - goal.x, player.position.z - goal.z) < 0.85) {
          finished = true;
          status.hidden = false;
          status.textContent = "Маяк достигнут!";
          break;
        }
      }
    }
    avatar.position.copyFrom(player.position);
    updateCamera();
  });

  const gltfLoader = import("@babylonjs/loaders/glTF");
  const crateReady = gltfLoader.then(() => addEquipmentCrate(scene, shadows, solids)).catch((error: unknown) => {
    if (!scene.isDisposed) console.warn("Could not load the equipment crate.", error);
  });
  const robotReady = gltfLoader.then(() => addScoutRobot(scene, shadows, avatar));
  const modelReady = Promise.all([crateReady, robotReady]).then(() => {
    if (scene.isDisposed) return;
    input.takeJump();
    input.takeRestart();
    reset();
    ready = true;
  });
  return { scene, modelReady };
}
