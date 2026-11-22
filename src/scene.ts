import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
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
import { Scene } from "@babylonjs/core/scene";
import floorTextureUrl from "./assets/floor.png?no-inline";
import scoutRobotUrl from "./assets/scout-robot.glb?url&no-inline";

async function addScoutRobot(scene: Scene, shadows: ShadowGenerator) {
  await import("@babylonjs/loaders/glTF");
  if (scene.isDisposed) return;

  const model = await LoadAssetContainerAsync(scoutRobotUrl, scene);
  if (scene.isDisposed) {
    model.dispose();
    return;
  }

  const robot = model.createRootMesh();
  robot.name = "Scout robot placement";
  robot.position.set(0.35, 0.95, 0.15);
  robot.rotation.y = Math.PI / 12;
  model.addAllToScene();
  shadows.addShadowCaster(robot);
}

export function createTestScene(engine: Engine, canvas: HTMLCanvasElement) {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#101C21FF");

  const camera = new ArcRotateCamera(
    "orbit",
    -Math.PI * 0.59,
    Math.PI * 0.33,
    20,
    new Vector3(0, 0.8, 0),
    scene,
  );
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 27;
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = 1.35;
  camera.panningSensibility = 0;
  camera.pinchToPanMaxDistance = 0;
  camera.wheelDeltaPercentage = 0.018;
  camera.fovMode = ArcRotateCamera.FOVMODE_HORIZONTAL_FIXED;
  camera.attachControl(canvas, false);

  const fill = new HemisphericLight("fill", new Vector3(0, 1, 0), scene);
  fill.intensity = 0.7;
  fill.groundColor = Color3.FromHexString("#63727B");

  const sun = new DirectionalLight("sun", new Vector3(0.7, -1, 0.55), scene);
  sun.position.set(-7, 10, -7);
  sun.intensity = 1.05;
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
  ) {
    const [width, height, depth] = size;
    const mesh = CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(...position);
    mesh.material = surface;
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
    return mesh;
  }

  const frame = material("dark frame", "#233C42");
  const wall = material("painted wall", "#375C61");
  const platform = material("platform surface", "#739C91");
  const accent = material("amber marking", "#E5A347");

  block("foundation", [14.3, 0.45, 10.3], [0, -0.26, 0], frame);
  const floor = CreateGround("textured floor", { width: 14, height: 10 }, scene);
  const floorMaterial = material("floor tiles", "#A4B5AE");
  const floorTexture = new Texture(floorTextureUrl, scene);
  floorTexture.uScale = 7;
  floorTexture.vScale = 5;
  floorMaterial.diffuseTexture = floorTexture;
  floor.material = floorMaterial;
  floor.receiveShadows = true;

  block("back wall left", [4.8, 3.2, 0.38], [-4.6, 1.6, 4.8], wall);
  block("back wall right", [6.8, 3.2, 0.38], [3.6, 1.6, 4.8], wall);
  block("door lintel", [2.4, 0.6, 0.38], [-1, 2.9, 4.8], wall);
  block("side wall", [0.38, 2.5, 5], [6.8, 1.25, 2.3], wall);

  block("step one", [2.5, 0.45, 2], [-2.7, 0.225, -1.25], platform);
  block("step two", [2.5, 0.95, 2], [0.35, 0.475, 0.15], platform);
  block("step three", [3.2, 1.45, 2.4], [3.85, 0.725, 1.6], platform);
  block("platform edge one", [2.44, 0.08, 0.09], [-2.7, 0.425, -2.21], accent);
  block("platform edge two", [2.44, 0.08, 0.09], [0.35, 0.925, -0.81], accent);
  block("platform edge three", [3.14, 0.08, 0.09], [3.85, 1.425, 0.44], accent);

  return { scene, modelReady: addScoutRobot(scene, shadows) };
}
