import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import { bossArena } from "./route";

const maxHealth = 6;
const slamRadius = 3.05;
type Phase = "idle" | "approach" | "windup" | "charge" | "recovery" | "defeated";
type Attack = "slam" | "charge";

export function createGuardian(scene: Scene, workshop: Workshop) {
  const { box, material, shadows } = workshop;
  const armor = material("Guardian armor", "#394152");
  const brass = material("Guardian brass", "#BA7751");
  const dark = material("Guardian joints", "#272436");
  const eye = material("Guardian light", "#E69B57", 0.55);
  const danger = material("Guardian windup", "#FF7859", 0.72);
  const weakness = material("Guardian exposed core", "#81EDE5", 0.78);
  const telegraph = material("Guardian attack area", "#FD6445", 0.7);
  telegraph.alpha = 0.35;
  telegraph.disableLighting = true;
  telegraph.backFaceCulling = false;

  const root = new TransformNode("Guardian", scene);
  const rig = new TransformNode("Guardian rig", scene);
  rig.parent = root;
  const torso = box("Guardian torso", [1.66, 1.24, 0.93], [0, 1.73, 0], armor, rig);
  box("Guardian chest housing", [1.27, 0.82, 0.19], [0, 1.74, 0.48], brass, rig);
  box("Guardian chest panel", [0.91, 0.59, 0.18], [0, 1.74, 0.57], dark, rig);
  const core = CreateCylinder("Guardian core", { height: 0.12, diameter: 0.45, tessellation: 6 }, scene);
  core.parent = rig;
  core.position.set(0, 1.74, 0.69);
  core.rotation.x = Math.PI / 2;
  const head = box("Guardian helmet", [1.09, 0.56, 0.94], [0, 2.61, 0.07], armor, rig);
  box("Guardian brow", [1.08, 0.12, 0.21], [0, 2.73, 0.57], brass, rig);
  const visor = box("Guardian visor", [0.75, 0.12, 0.1], [0, 2.58, 0.56], eye, rig);
  shadows.addShadowCaster(torso, false);
  shadows.addShadowCaster(head, false);
  const arms = [-1, 1].map((side) => {
    const arm = new TransformNode("Guardian arm", scene);
    arm.parent = rig;
    arm.position.set(side * 1.02, 2.05, 0);
    box("Guardian shoulder", [0.65, 0.62, 0.74], [0, -0.14, 0], brass, arm);
    box("Guardian upper arm", [0.45, 0.73, 0.49], [0, -0.55, 0.03], dark, arm);
    box("Guardian gauntlet", [0.67, 0.74, 0.78], [0, -0.93, 0.17], armor, arm);
    box("Guardian gauntlet light", [0.52, 0.1, 0.06], [0, -0.87, 0.58], eye, arm);
    return arm;
  });
  const legs = [-1, 1].map((side) => {
    const leg = new TransformNode("Guardian leg", scene);
    leg.parent = rig;
    leg.position.set(side * 0.42, 1, 0);
    box("Guardian shin", [0.46, 0.74, 0.57], [0, -0.35, 0], dark, leg);
    box("Guardian boot", [0.63, 0.32, 0.87], [0, -0.81, 0.1], armor, leg);
    return leg;
  });

  const circle = CreateDisc("Slam warning floor", { radius: slamRadius, tessellation: 44 }, scene);
  circle.rotation.x = Math.PI / 2;
  circle.material = telegraph;
  const rim = CreateTorus("Slam warning edge", { diameter: slamRadius * 2, thickness: 0.055, tessellation: 44 }, scene);
  rim.material = danger;
  const lane = box("Charge warning lane", [3.04, 0.018, 1], [0, 0, 0], telegraph);
  const direction = new Vector3(0, 0, -1);
  const { x, halfWidth, top, front, back, home } = bossArena;
  const left = x - halfWidth + 1.2;
  const right = x + halfWidth - 1.2;
  const near = front + 0.95;
  const far = back - 1.35;

  let phase: Phase = "idle";
  let next: Attack = "slam";
  let health = maxHealth;
  let time = 0;
  let chargeLeft = 0;
  let hurtFlash = 0;

  function enterRecovery() {
    phase = "recovery";
    time = 1.48;
    next = next === "slam" ? "charge" : "slam";
  }

  function beginAttack() {
    chargeLeft = Math.min(7.9,
      direction.x > 0 ? (right - root.position.x) / direction.x : direction.x < 0 ? (left - root.position.x) / direction.x : Infinity,
      direction.z > 0 ? (far - root.position.z) / direction.z : direction.z < 0 ? (near - root.position.z) / direction.z : Infinity);
    if (next === "charge" && chargeLeft < 1.45) next = "slam";
    phase = "windup";
    time = next === "slam" ? 0.83 : 0.92;
  }

  function update(dt: number, target: Vector3) {
    hurtFlash = Math.max(0, hurtFlash - dt);
    time = Math.max(0, time - dt);
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    const distance = Math.hypot(dx, dz);
    const onFloor = target.y - top < 0.82;
    if (phase === "approach") {
      if (distance > 0.015) direction.set(dx / distance, 0, dz / distance);
      root.rotation.y = Math.atan2(direction.x, direction.z);
      if (distance <= (next === "slam" ? 3.25 : 7.9)) {
        beginAttack();
      } else {
        const stride = (health <= 3 ? 2.88 : 2.37) * dt;
        root.position.x = Math.max(left, Math.min(right, root.position.x + direction.x * stride));
        root.position.z = Math.max(near, Math.min(far, root.position.z + direction.z * stride));
      }
    } else if (phase === "windup" && time === 0) {
      if (next === "charge") {
        phase = "charge";
      } else {
        enterRecovery();
        return onFloor && distance <= slamRadius;
      }
    } else if (phase === "charge") {
      const stride = Math.min(chargeLeft, 11.3 * dt);
      root.position.addInPlaceFromFloats(direction.x * stride, 0, direction.z * stride);
      chargeLeft -= stride;
      if (chargeLeft <= 0.001) enterRecovery();
      return onFloor && Math.hypot(target.x - root.position.x, target.z - root.position.z) < 1.52;
    } else if (phase === "recovery" && time === 0) {
      phase = "approach";
    }
    return false;
  }

  const hints = {
    idle: "",
    approach: "Дождитесь атаки Хранителя",
    windup: "",
    charge: "Уйдите с линии рывка",
    recovery: "Бейте по открытому ядру",
    defeated: "",
  };

  return {
    maxHealth,
    get health() { return health; },
    get active() { return phase !== "idle" && phase !== "defeated"; },
    get defeated() { return phase === "defeated"; },
    get hint() {
      if (phase === "windup") return next === "slam" ? "Прыгните или выйдите из круга" : "Уйдите с линии рывка";
      return hints[phase];
    },
    start() { if (phase === "idle") phase = "approach"; },
    update,
    strike(inReach: (target: Vector3, range: number) => boolean) {
      if (phase !== "recovery" || !inReach(root.position, 2.45)) return false;
      health--;
      hurtFlash = 0.17;
      if (health === 0) phase = "defeated";
      return true;
    },
    draw(clock: number) {
      root.setEnabled(phase !== "defeated");
      const winding = phase === "windup";
      const weak = phase === "recovery";
      const walking = phase === "approach" || phase === "charge";
      const stride = walking ? Math.sin(clock * 12) * 0.53 : 0;
      core.material = weak ? weakness : winding ? danger : eye;
      visor.material = weak ? weakness : winding ? danger : eye;
      torso.material = hurtFlash > 0 ? brass : armor;
      rig.position.y = weak ? -0.22 : Math.abs(stride) * 0.12;
      for (const [index, arm] of arms.entries()) {
        const side = index === 0 ? -1 : 1;
        arm.rotation.x = winding ? (next === "slam" ? -2.48 : -0.88) : weak ? 0.38 : phase === "charge" ? -0.93 : stride * side;
        arm.rotation.z = side * (weak ? 0.46 : 0.05);
        legs[index].rotation.x = -stride * side;
      }
      const showCircle = winding && next === "slam";
      circle.setEnabled(showCircle);
      rim.setEnabled(showCircle);
      lane.setEnabled(winding && next === "charge" && chargeLeft > 0.15);
      if (showCircle) {
        circle.position.copyFrom(root.position).y = top + 0.06;
        rim.position.copyFrom(root.position).y = top + 0.075;
      }
      if (lane.isEnabled()) {
        lane.scaling.z = chargeLeft;
        lane.rotation.y = root.rotation.y;
        lane.position.set(root.position.x + direction.x * chargeLeft / 2, top + 0.055,
          root.position.z + direction.z * chargeLeft / 2);
      }
      telegraph.alpha = 0.27 + 0.11 * Math.sin(clock * 17) ** 2;
    },
    reset() {
      phase = "idle";
      next = "slam";
      health = maxHealth;
      time = 0;
      chargeLeft = 0;
      hurtFlash = 0;
      direction.set(0, 0, -1);
      root.position.copyFrom(home);
      root.rotation.y = Math.PI;
    },
  };
}
