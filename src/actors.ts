import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import type { XYZ } from "./route";
import { ellipsoid, foldedMesh, pivot } from "./visual-mesh";

export function createCranes(scene: Scene, { material, shadows, textures }: Workshop) {
  const paper = material("Crane ivory parchment", "#FFE4B1", 0.1, textures.paper);
  const crease = material("Crane shaded folds", "#C2A079", 0.1, textures.paper);
  const edge = material("Crane gilded fold", "#D09A52", 0.21, textures.paper);
  const warning = material("Crane attack warning", "#FF9E4C", 0.78, textures.paper);
  const red = material("Crane hit flash", "#FFB3A2", 0.5, textures.paper);
  const empty = material("Crane empty health", "#41445D");
  for (const surface of [paper, crease, edge, warning, red]) surface.backFaceCulling = false;

  function createCrane(name: string, home: Vector3) {
    const root = new TransformNode(name, scene);
    root.position.copyFrom(home);
    const flight = pivot("Origami crane", root, [0, 0.8, 0]);
    const front: XYZ = [0, 0.06, 0.48], rear: XYZ = [0, 0.04, -0.53], ridge: XYZ = [0, 0.18, -0.02];
    const left: XYZ = [-0.26, 0.03, 0], right: XYZ = [0.26, 0.03, 0], underside: XYZ = [0, -0.23, -0.04];
    const tailTip: XYZ = [0, 0.37, -0.87], tailFold: XYZ = [0.1, 0.12, -0.35];
    const body = foldedMesh(scene, "Crane folded body", flight, [paper, crease, edge], [
      [[front, left, ridge], [rear, right, ridge], [rear, tailTip, tailFold]],
      [[front, underside, left], [rear, left, underside], [rear, underside, right], [front, right, underside]],
      [[front, ridge, right], [rear, ridge, left], [rear, [-0.1, 0.12, -0.35], tailTip]],
    ]);
    const neck = pivot("Crane paper neck", flight, front);
    const shin: XYZ = [0, -0.104, -0.035], base: XYZ = [0, 0.065, -0.105];
    const crown: XYZ = [0, 0.535, 0.24], jaw: XYZ = [0, 0.41, 0.28], beak: XYZ = [0, 0.335, 0.445];
    const neckFold: XYZ = [0.092, 0.027, -0.063], headFold: XYZ = [0.05, 0.469, 0.25];
    foldedMesh(scene, "Crane angular neck and beak", neck, [paper, crease, edge], [
      [[base, crown, neckFold], [base, [-0.092, 0.027, -0.063], crown]],
      [[shin, neckFold, jaw], [neckFold, crown, jaw], [shin, jaw, [-0.092, 0.027, -0.063]],
        [[-0.092, 0.027, -0.063], jaw, crown]],
      [[crown, headFold, beak], [headFold, jaw, beak], [crown, beak, [-0.05, 0.469, 0.25]],
        [[-0.05, 0.469, 0.25], beak, jaw]],
    ]);
    const wings = [-1, 1].map((side) => {
      const wing = pivot("Crane hinged wing", flight, [side * 0.18, 0, 0]);
      const leading: XYZ = [0, 0.048, 0.32], trailing: XYZ = [0, -0.04, -0.44];
      const wingTip: XYZ = [side * 1.02, -0.015, -0.33], fold: XYZ = [side * 0.53, 0.17, -0.09];
      const wingHeel: XYZ = [side * 0.6, -0.073, -0.53];
      foldedMesh(scene, "Triangulated paper wing", wing, [paper, crease, edge], [
        [[leading, fold, wingTip]], [[trailing, wingHeel, fold], [fold, wingHeel, wingTip]], [[leading, trailing, fold]],
      ]);
      return wing;
    });
    for (const mesh of flight.getChildMeshes()) shadows.addShadowCaster(mesh, false);
    const pips = [-1, 1].map((side) =>
      ellipsoid("Crane hit point", root, edge, [side * 0.112, 1.56, 0], [0.144, 0.061, 0.115]));

    return {
      root,
      home,
      health: 2,
      windup: 0,
      cooldown: 0,
      stagger: 0,
      draw(clock: number) {
        root.setEnabled(this.health > 0);
        const flapping = Math.sin(clock * 11 + home.z);
        const charging = this.windup > 0;
        flight.position.y = 0.75 + flapping * 0.105;
        flight.rotation.x = charging ? 0.31 : flapping * 0.06;
        neck.rotation.x = charging ? 0.3 : -flapping * 0.05;
        body[0].material = this.stagger > 0 ? red : charging ? warning : paper;
        for (const [index, wing] of wings.entries()) {
          wing.rotation.z = (index === 0 ? -1 : 1) * (charging ? 0.6 : 0.16 + flapping * 0.5);
        }
        for (const [index, pip] of pips.entries()) pip.material = index < this.health ? charging ? warning : edge : empty;
      },
      reset() {
        root.position.copyFrom(home);
        root.rotation.y = Math.PI;
        this.health = 2;
        this.windup = 0;
        this.cooldown = 0;
        this.stagger = 0;
      },
    };
  }

  return createCrane;
}
