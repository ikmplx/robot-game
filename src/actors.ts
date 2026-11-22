import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import type { XYZ } from "./route";
import { ellipsoid, foldedMesh, ovalBetween, pivot } from "./visual-mesh";

export function createActors(scene: Scene, workshop: Workshop) {
  const { material, shadows, textures } = workshop;
  const shirt = material("Cream cotton shirt", "#FFF0D7", 0, textures.linen);
  const skin = material("Warm skin", "#EAAF7F");
  const cheeks = material("Warm cheeks", "#D9916B");
  const hair = material("Chestnut hair", "#613622");
  const hairLight = material("Copper hair highlights", "#8C5230");
  const denim = material("Indigo trousers", "#364568", 0, textures.linen);
  const boots = material("Boot leather", "#382B31", 0, textures.linen);
  const soles = material("Boot soles", "#85654E");
  const pack = material("Blue canvas backpack", "#35578B", 0, textures.linen);
  const strap = material("Backpack webbing", "#253448", 0, textures.linen);
  const pupil = material("Dark eyes", "#271A2E");
  const ivory = material("Eye whites", "#FFF9E5");
  const glint = material("Eye highlights", "#FFF9F0", 0.35);
  const parchment = material("Scroll parchment", "#FDCF87", 0.18, textures.paper);
  const brass = material("Scroll fittings", "#BB7533", 0.08);
  const amber = material("Golden bindings", "#FFD078", 0.55);
  const blade = material("Gilded sword", "#FFDB89", 0.72);
  const pandaRed = material("Russet panda fur", "#DF7238", 0, textures.fur);
  const pandaDark = material("Dark panda fur", "#62362E", 0, textures.fur);
  const pandaCream = material("Cream panda fur", "#FFF0CF", 0, textures.fur);
  const pandaHair = material("Midnight panda fringe", "#30324D", 0, textures.fur);

  const avatar = new TransformNode("Library adventurer", scene);
  const rig = pivot("Adventurer rig", avatar);
  ellipsoid("Shirt", rig, shirt, [0, 0.86, 0], [0.49, 0.61, 0.34]);
  ellipsoid("Hips", rig, denim, [0, 0.57, 0], [0.42, 0.26, 0.31]);
  ellipsoid("Neck", rig, skin, [0, 1.14, 0.025], [0.18, 0.2, 0.17]);
  const head = ellipsoid("Face", rig, skin, [0, 1.37, 0.047], [0.42, 0.46, 0.37]);
  const hairCap = ellipsoid("Hair crown", rig, hair, [0, 1.49, 0.017], [0.47, 0.32, 0.42]);
  shadows.addShadowCaster(head, false);
  shadows.addShadowCaster(hairCap, false);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.062;
    const spike = CreateCylinder("Swept hair lock", {
      height: 0.16 + (i % 3) * 0.035, diameterTop: 0.014, diameterBottom: 0.17, tessellation: 5,
    }, scene);
    spike.parent = rig;
    spike.position.set(x, 1.62 - Math.abs(x) * 0.27, 0.045 - (i % 2) * 0.1);
    spike.rotation.set(-0.37, i * 0.48, (i - 4) * -0.13);
    spike.material = i % 3 === 0 ? hairLight : hair;
  }
  for (const side of [-1, 1]) {
    ellipsoid("Ear", rig, cheeks, [side * 0.199, 1.36, 0.046], [0.085, 0.13, 0.084]);
    ellipsoid("Eye", rig, ivory, [side * 0.083, 1.41, 0.214], [0.094, 0.107, 0.043]);
    ellipsoid("Iris", rig, pupil, [side * 0.078, 1.405, 0.236], [0.05, 0.067, 0.027]);
    ellipsoid("Eye glint", rig, glint, [side * 0.078 - 0.009, 1.42, 0.249], [0.018, 0.02, 0.008]);
    ellipsoid("Eyebrow", rig, hair, [side * 0.088, 1.484, 0.207], [0.103, 0.032, 0.025]).rotation.z = side * -0.16;
    ovalBetween("Backpack shoulder strap", rig, strap, [side * 0.17, 0.68, 0.15], [side * 0.17, 1.101, 0.09], 0.072, 0.045);
  }
  ellipsoid("Nose", rig, skin, [0, 1.36, 0.242], [0.085, 0.109, 0.075]);
  ellipsoid("Smile", rig, cheeks, [0.01, 1.285, 0.209], [0.118, 0.025, 0.028]);
  const backpack = ellipsoid("Canvas backpack", rig, pack, [0, 0.858, -0.218], [0.49, 0.5, 0.29]);
  shadows.addShadowCaster(backpack, false);
  ellipsoid("Backpack flap", rig, strap, [0, 1.003, -0.291], [0.445, 0.22, 0.2]);
  ellipsoid("Brass clasp", rig, amber, [0, 0.966, -0.392], [0.105, 0.102, 0.027]);

  const scroll = pivot("Gilded scroll", rig, [-0.015, 0.74, -0.36]);
  scroll.rotation.z = -1.08;
  function scrollBand(name: string, surface: typeof parchment, height: number, diameter: number, y: number) {
    const piece = CreateCylinder(name, { height, diameter, tessellation: 16 }, scene);
    piece.parent = scroll;
    piece.position.y = y;
    piece.material = surface;
  }
  scrollBand("Rolled parchment", parchment, 0.61, 0.17, 0);
  scrollBand("Central scroll binding", brass, 0.12, 0.183, 0);
  for (const side of [-1, 1]) {
    scrollBand("Scroll end fitting", brass, 0.07, 0.2, side * 0.299);
    scrollBand("Luminous scroll seal", amber, 0.022, 0.15, side * 0.34);
  }

  const panda = pivot("Red panda companion", rig, [-0.29, 1.073, -0.141]);
  panda.rotation.y = -1.32;
  ellipsoid("Panda body", panda, pandaRed, [0, 0.14, -0.046], [0.34, 0.33, 0.29]);
  const pandaHead = pivot("Panda head", panda, [0, 0.32, 0.037]);
  ellipsoid("Panda face", pandaHead, pandaRed, [0, 0, 0], [0.385, 0.31, 0.3]);
  ellipsoid("Panda muzzle", pandaHead, pandaCream, [0, -0.065, 0.125], [0.2, 0.116, 0.101]);
  ellipsoid("Panda nose", pandaHead, pupil, [0, -0.038, 0.175], [0.057, 0.039, 0.027]);
  for (const side of [-1, 1]) {
    ellipsoid("Panda ear", pandaHead, pandaRed, [side * 0.142, 0.13, -0.012], [0.111, 0.147, 0.076]).rotation.z = -side * 0.3;
    ellipsoid("Panda inner ear", pandaHead, pandaCream, [side * 0.145, 0.143, 0.019], [0.072, 0.092, 0.024]).rotation.z = -side * 0.3;
    ellipsoid("Panda cheek patch", pandaHead, pandaCream, [side * 0.122, -0.051, 0.079], [0.117, 0.115, 0.092]);
    ellipsoid("Panda brow markings", pandaHead, pandaCream, [side * 0.083, 0.057, 0.116], [0.072, 0.045, 0.037]);
    ellipsoid("Panda eye", pandaHead, pupil, [side * 0.087, 0.009, 0.137], [0.056, 0.067, 0.035]);
    ellipsoid("Panda eye glint", pandaHead, glint, [side * 0.087 - 0.01, 0.023, 0.154], [0.017, 0.018, 0.008]);
    ellipsoid("Panda paw", panda, pandaDark, [side * 0.1, 0.016, 0.097], [0.103, 0.13, 0.117]);
  }
  ellipsoid("Panda fringe", pandaHead, pandaHair, [0.035, 0.123, 0.015], [0.255, 0.121, 0.246]).rotation.z = -0.24;
  const tail = pivot("Ringed panda tail", panda, [0.055, 0.13, -0.13]);
  const tailPoints: XYZ[] = [[0, 0, 0], [0.066, -0.084, -0.085], [0.105, -0.153, -0.164],
    [0.104, -0.164, -0.262], [0.065, -0.116, -0.334], [0.009, -0.054, -0.377], [-0.036, 0.02, -0.399]];
  for (let i = 1; i < tailPoints.length; i++) {
    ovalBetween("Panda tail ring", tail, i % 2 ? pandaRed : pandaDark,
      tailPoints[i - 1], tailPoints[i], 0.226 - i * 0.017);
  }

  const legs = [-1, 1].map((side) => {
    const leg = pivot("Adventurer leg", rig, [side * 0.125, 0.6, 0]);
    ovalBetween("Trouser leg", leg, denim, [0, -0.023, 0], [side * 0.013, -0.43, 0.016], 0.195, 0.205);
    ellipsoid("Boot upper", leg, boots, [side * 0.013, -0.48, 0.058], [0.203, 0.21, 0.28]);
    ellipsoid("Boot sole", leg, soles, [side * 0.013, -0.558, 0.062], [0.218, 0.074, 0.295]);
    return leg;
  });
  const arms = [-1, 1].map((side) => {
    const arm = pivot("Adventurer arm", rig, [side * 0.248, 1.063, 0]);
    ovalBetween("Sleeve", arm, shirt, [0, 0, 0], [side * 0.054, -0.146, 0], 0.19, 0.21);
    ovalBetween("Forearm", arm, skin, [side * 0.056, -0.117, 0.009], [side * 0.093, -0.334, 0.035], 0.124, 0.141);
    ellipsoid("Hand", arm, skin, [side * 0.096, -0.352, 0.034], [0.141, 0.145, 0.131]);
    return arm;
  });

  const sword = pivot("Sword swing", rig, [0.04, 0.79, 0]);
  ovalBetween("Sword grip", sword, boots, [0.28, 0, 0], [0.51, 0, 0], 0.09);
  ovalBetween("Sword guard", sword, brass, [0.53, -0.13, 0], [0.53, 0.13, 0], 0.075);
  const hilt: XYZ = [0.47, 0, 0], point: XYZ = [1.43, 0, 0];
  const upper: XYZ = [0.68, 0.101, 0], lower: XYZ = [0.68, -0.101, 0], ridge: XYZ = [0.73, 0, 0.059];
  blade.backFaceCulling = false;
  foldedMesh(scene, "Sword blade", sword, [blade], [[[hilt, upper, ridge], [hilt, ridge, lower],
    [upper, point, ridge], [ridge, point, lower]]]);
  sword.setEnabled(false);

  function drawScout(clock: number, moving: boolean, grounded: boolean, swing: number, flashing: boolean, hanging: boolean) {
    const stride = moving && grounded ? Math.sin(clock * 16) * 0.63 : 0;
    rig.position.y = Math.abs(stride) * 0.077;
    rig.setEnabled(!flashing || Math.floor(clock * 18) % 2 === 0);
    legs[0].rotation.x = hanging ? -0.46 : grounded ? stride : -0.21;
    legs[1].rotation.x = hanging ? -0.28 : grounded ? -stride : 0.31;
    for (const [index, arm] of arms.entries()) {
      arm.position.y = hanging ? 1.18 : 1.063;
      arm.rotation.x = hanging ? -2.77 : stride * (index === 0 ? -0.55 : 0.55);
      arm.rotation.z = hanging ? (index === 0 ? -0.32 : 0.32) : index === 1 && swing > 0 ? 1.12 : 0;
    }
    pandaHead.rotation.y = 0.18 + Math.sin(clock * 2.2) * 0.17;
    tail.rotation.x = Math.sin(clock * (moving ? 11 : 3)) * 0.14;
    sword.setEnabled(swing > 0);
    sword.rotation.y = -2.5 + 3.45 * swing;
  }

  const paper = material("Crane ivory parchment", "#FFE4B1", 0.1, textures.paper);
  const crease = material("Crane shaded folds", "#C2A079", 0.1, textures.paper);
  const edge = material("Crane gilded fold", "#D09A52", 0.21, textures.paper);
  const warning = material("Crane attack warning", "#FF9E4C", 0.78, textures.paper);
  const red = material("Crane hit flash", "#FFB3A2", 0.5, textures.paper);
  const empty = material("Crane empty health", "#41445D");
  for (const surface of [paper, crease, edge, warning, red]) surface.backFaceCulling = false;

  function monster(name: string, home: Vector3) {
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

  return { avatar, drawScout, monster };
}
