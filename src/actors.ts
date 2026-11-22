import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";

export function createActors(scene: Scene, workshop: Workshop) {
  const { box, material, shadows } = workshop;
  const suit = material("Scout white", "#DBE6FC");
  const joints = material("Scout joints", "#242740");
  const teal = material("Scout teal", "#248E9C");
  const visor = material("Scout visor", "#73F7F0", 0.7);
  const blade = material("Energy baton", "#97FFF7", 0.65);
  const enemyShell = material("Monster shell", "#95486D");
  const enemyArmor = material("Monster plates", "#DA6284");
  const enemyDark = material("Monster joints", "#472742");
  const enemyEyes = material("Monster eyes", "#FF839C", 0.75);
  const warning = material("Monster windup", "#FFC064", 0.75);
  const empty = material("Monster empty life", "#3B263E");

  const avatar = new TransformNode("Scout", scene);
  const rig = new TransformNode("Scout rig", scene);
  rig.parent = avatar;
  box("Torso", [0.63, 0.57, 0.43], [0, 0.78, 0], teal, rig);
  box("Chest plate", [0.43, 0.37, 0.075], [0, 0.78, 0.24], suit, rig);
  box("Backpack", [0.52, 0.4, 0.17], [0, 0.79, -0.26], joints, rig);
  box("Backpack light", [0.29, 0.075, 0.035], [0, 0.82, -0.36], visor, rig);
  const head = box("Helmet", [0.68, 0.43, 0.58], [0, 1.23, 0.035], suit, rig);
  box("Visor gasket", [0.55, 0.23, 0.06], [0, 1.23, 0.338], joints, rig);
  box("Visor", [0.42, 0.09, 0.035], [0, 1.24, 0.378], visor, rig);
  box("Antenna", [0.046, 0.2, 0.046], [-0.25, 1.53, -0.09], joints, rig);
  box("Antenna light", [0.092, 0.083, 0.092], [-0.25, 1.65, -0.09], visor, rig);
  shadows.addShadowCaster(head, false);

  const legs = [-1, 1].map((side) => {
    const leg = new TransformNode("Scout leg", scene);
    leg.parent = rig;
    leg.position.set(side * 0.17, 0.5, 0);
    box("Leg", [0.17, 0.33, 0.18], [0, -0.15, 0], joints, leg);
    box("Boot", [0.25, 0.17, 0.36], [0, -0.4, 0.05], suit, leg);
    return leg;
  });

  const arms = [-1, 1].map((side) => {
    const arm = new TransformNode("Scout arm", scene);
    arm.parent = rig;
    arm.position.set(side * 0.39, 0.99, 0);
    box("Shoulder", [0.22, 0.2, 0.25], [0, -0.05, 0], suit, arm);
    box("Forearm", [0.18, 0.29, 0.2], [0, -0.26, 0.015], joints, arm);
    return arm;
  });

  const baton = new TransformNode("Baton pivot", scene);
  baton.parent = rig;
  baton.position.set(0.04, 0.79, 0);
  box("Baton handle", [0.22, 0.14, 0.14], [0.44, 0, 0], joints, baton);
  box("Energy blade", [0.84, 0.13, 0.21], [0.96, 0, 0], blade, baton);
  baton.setEnabled(false);

  function drawScout(clock: number, moving: boolean, grounded: boolean, swing: number, flashing: boolean) {
    const stride = moving && grounded ? Math.sin(clock * 16) * 0.63 : 0;
    rig.position.y = Math.abs(stride) * 0.095;
    rig.setEnabled(!flashing || Math.floor(clock * 18) % 2 === 0);
    legs[0].rotation.x = stride;
    legs[1].rotation.x = -stride;
    arms[0].rotation.x = -stride * 0.55;
    arms[1].rotation.x = stride * 0.55;
    arms[1].rotation.z = swing > 0 ? 1.15 : 0;
    baton.setEnabled(swing > 0);
    baton.rotation.y = -2.5 + 3.45 * swing;
  }

  function monster(name: string, home: Vector3) {
    const root = new TransformNode(name, scene);
    root.position.copyFrom(home);
    const body = CreateSphere("Monster body", { diameter: 1.08, segments: 10 }, scene);
    body.parent = root;
    body.position.y = 0.6;
    body.scaling.set(1.18, 0.83, 0.95);
    body.material = enemyShell;
    shadows.addShadowCaster(body, false);
    for (const side of [-1, 1]) {
      const horn = CreateCylinder("Horn", { height: 0.39, diameterTop: 0.035, diameterBottom: 0.25, tessellation: 5 }, scene);
      horn.parent = root;
      horn.position.set(side * 0.39, 1.12, 0);
      horn.rotation.z = -side * 0.34;
      horn.material = enemyArmor;
      box("Claw", [0.3, 0.19, 0.43], [side * 0.43, 0.12, 0.29], enemyDark, root);
    }
    box("Mask", [0.65, 0.29, 0.16], [0, 0.65, 0.44], enemyDark, root);
    const eyes = [-1, 1].map((side) => (
      box("Eye", [0.19, 0.11, 0.065], [side * 0.15, 0.69, 0.54], enemyEyes, root)
    ));
    const life = [-1, 1].map((side) => (
      box("Life pip", [0.24, 0.066, 0.09], [side * 0.139, 1.66, 0], enemyEyes, root)
    ));

    return {
      root,
      home,
      health: 2,
      windup: 0,
      cooldown: 0,
      stagger: 0,
      draw(clock: number) {
        root.setEnabled(this.health > 0);
        body.position.y = 0.61 + Math.sin(clock * 7 + home.z) * 0.065;
        body.material = this.stagger > 0 ? enemyArmor : enemyShell;
        for (const eye of eyes) eye.material = this.windup > 0 ? warning : enemyEyes;
        for (const [index, pip] of life.entries()) pip.material = index < this.health ? enemyEyes : empty;
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
