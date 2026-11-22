import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Workshop } from "./level";
import { bossArena, type XYZ } from "./route";
import { ellipsoid, foldedMesh, ovalBetween, pivot } from "./visual-mesh";

const maxHealth = 6;
const slamRadius = 3.05;
type Phase = "idle" | "approach" | "windup" | "charge" | "recovery" | "defeated";
type Attack = "slam" | "charge";

export function createGuardian(scene: Scene, workshop: Workshop) {
  const { box, material, textures } = workshop;
  const spirit = material("Moonlit spectral fur", "#72ABE8", 0.49, textures.spirit);
  const mane = material("Pale spectral fur", "#AFDCF8", 0.55, textures.spirit);
  const injured = material("Spectral hit flash", "#FFF4AD", 0.9);
  const innerEar = material("Blue inner ears", "#3E5A96", 0.25);
  const socket = material("Spectral eye sockets", "#223865", 0.23);
  const eye = material("Guardian golden eyes", "#FFCF75", 0.9);
  const danger = material("Guardian windup", "#FF8861", 0.8);
  const weakness = material("Guardian exposed core", "#95FFE9", 0.8);
  const vapor = material("Spectral vapor", "#7DCCFF", 0.85);
  const telegraph = material("Guardian attack area", "#FD6445", 0.7);
  telegraph.alpha = 0.35;
  telegraph.disableLighting = true;
  telegraph.backFaceCulling = false;
  const rimLight = new FresnelParameters({
    leftColor: Color3.FromHexString("#92DCFF"),
    rightColor: Color3.Black(),
    bias: 0.16,
    power: 2.8,
  });
  for (const surface of [spirit, mane]) {
    surface.alpha = 0.91;
    surface.needDepthPrePass = true;
    surface.emissiveFresnelParameters = rimLight;
  }
  vapor.alpha = 0.24;
  innerEar.backFaceCulling = false;

  const root = new TransformNode("Ghost cat guardian", scene);
  const rig = pivot("Spectral cat rig", root);
  const chest = ellipsoid("Cat chest", rig, spirit, [0, 1.48, 0.38], [1.83, 1.68, 1.69]);
  const haunches = ellipsoid("Cat haunches", rig, spirit, [0, 1.24, -0.72], [1.72, 1.62, 2.26]);
  ellipsoid("Pale chest ruff", rig, mane, [0, 1.5, 0.93], [1.22, 1.24, 0.62]);
  const head = pivot("Cat head", rig, [0, 2.16, 0.87]);
  ellipsoid("Cat face", head, spirit, [0, 0.13, 0.17], [1.82, 1.45, 1.45]);
  ellipsoid("Cat chin", head, mane, [0, -0.2, 0.47], [1.1, 0.63, 0.88]);
  ellipsoid("Cat nose", head, socket, [0, 0.023, 0.972], [0.259, 0.168, 0.095]);
  const eyes = [-1, 1].map((side) => {
    const outer: XYZ = [side * 0.88, 0.42, 0.24], inner: XYZ = [side * 0.22, 0.67, 0.2];
    const tip: XYZ = [side * 0.83, 1.18, 0.2], back: XYZ = [side * 0.62, 0.55, -0.33];
    const earRim: XYZ = [side * 0.72, 0.97, 0.31];
    foldedMesh(scene, "Cat pointed ear", head, [spirit, innerEar], [
      [[outer, tip, back], [tip, inner, back], [inner, outer, back],
        [outer, earRim, tip], [earRim, inner, tip]],
      [[outer, inner, earRim]],
    ]);
    ellipsoid("Cat muzzle", head, mane, [side * 0.2, -0.092, 0.794], [0.48, 0.39, 0.4]);
    for (let line = 0; line < 3; line++) {
      ovalBetween("Spectral whisker", head, mane, [side * 0.34, -0.107, 0.893],
        [side * (0.97 - line * 0.04), 0.047 - line * 0.15, 0.76], 0.033);
    }
    const eyesocket = ellipsoid("Cat eye socket", head, socket, [side * 0.397, 0.241, 0.753], [0.477, 0.296, 0.17]);
    eyesocket.rotation.z = side * 0.24;
    const iris = ellipsoid("Glowing cat eye", head, eye, [side * 0.395, 0.247, 0.841], [0.335, 0.19, 0.08]);
    iris.rotation.z = side * 0.24;
    ellipsoid("Cat slit pupil", head, socket, [side * 0.395, 0.247, 0.884], [0.077, 0.158, 0.027]);
    return iris;
  });
  const core = ellipsoid("Cat's spirit core", rig, eye, [0, 1.558, 1.269], [0.33, 0.38, 0.17]);
  const setting = CreateTorus("Spirit seal", { diameter: 0.49, thickness: 0.045, tessellation: 24 }, scene);
  setting.parent = rig;
  setting.position.copyFrom(core.position);
  setting.rotation.x = Math.PI / 2;
  setting.material = mane;

  const paws = [-1, 1].map((side) => {
    const foreleg = pivot("Cat front leg", rig, [side * 0.557, 1.51, 0.71]);
    ovalBetween("Cat foreleg", foreleg, spirit, [0, 0, 0], [side * 0.075, -0.9, 0.22], 0.54, 0.62);
    ellipsoid("Cat forepaw", foreleg, mane, [side * 0.075, -0.945, 0.326], [0.605, 0.42, 0.749]);
    for (const toe of [-1, 0, 1]) {
      ellipsoid("Cat toe", foreleg, mane, [side * 0.075 + toe * 0.156, -0.958, 0.576], [0.182, 0.23, 0.272]);
    }
    const hindleg = pivot("Cat hind leg", rig, [side * 0.52, 0.96, -1.016]);
    ellipsoid("Cat hind thigh", hindleg, spirit, [0, 0, 0], [0.76, 1.13, 1]);
    ellipsoid("Cat hind paw", hindleg, mane, [0, -0.51, 0.17], [0.57, 0.39, 0.72]);
    return { foreleg, hindleg };
  });

  const tail = pivot("Spectral cat tail", rig, [0, 1.29, -1.5]);
  const path = [[0, 0, 0], [-0.16, 0.17, -0.4], [-0.53, 0.54, -0.68],
    [-0.59, 1.01, -0.81], [-0.29, 1.38, -0.9], [0.17, 1.55, -0.83], [0.52, 1.47, -0.73]]
    .map(([x, y, z]) => new Vector3(x, y, z));
  const tailMesh = CreateTube("Tapered ghost tail", {
    path, tessellation: 16, radiusFunction: (i) => 0.27 - i * 0.036,
  }, scene);
  tailMesh.parent = tail;
  tailMesh.material = spirit;
  const mist = Array.from({ length: 5 }, (_, i) => {
    const wisp = ellipsoid("Floating spectral wisp", rig, vapor, [0, 0, 0], [0.34, 0.17, 0.86]);
    wisp.rotation.z = 0.25 * (i - 2);
    return wisp;
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
    draw(clock: number, player: Vector3) {
      root.setEnabled(phase !== "defeated");
      const winding = phase === "windup";
      const weak = phase === "recovery";
      const distance = Math.hypot(root.position.x - player.x, root.position.z - player.z);
      const proximity = Math.max(0, Math.min(1, (distance - 0.65) / 1.5));
      const bodyOpacity = 0.49 + proximity * 0.42;
      spirit.alpha = mane.alpha = injured.alpha = bodyOpacity;
      const walking = phase === "approach" || phase === "charge";
      const stride = walking ? Math.sin(clock * 12) * 0.53 : 0;
      core.material = weak ? weakness : winding ? danger : eye;
      core.scaling.setAll(weak ? 0.43 : 0.26);
      for (const iris of eyes) iris.material = winding ? danger : eye;
      chest.material = haunches.material = hurtFlash > 0 ? injured : spirit;
      rig.position.y = (weak ? -0.19 : 0) + Math.sin(clock * 3) * 0.095 + Math.abs(stride) * 0.1;
      rig.rotation.x = winding && next === "slam" ? -0.28 : phase === "charge" ? 0.14 : 0;
      head.rotation.x = weak ? 0.08 : winding ? -0.12 : 0.035 * Math.sin(clock * 4.8);
      tail.rotation.y = Math.sin(clock * 3.2) * 0.3;
      for (const [index, { foreleg, hindleg }] of paws.entries()) {
        const side = index === 0 ? -1 : 1;
        foreleg.rotation.x = winding ? (next === "slam" ? -0.92 : -0.33)
          : phase === "charge" ? -0.54 + stride * side : stride * side;
        hindleg.rotation.x = -stride * side * 0.65;
      }
      for (const [index, wisp] of mist.entries()) {
        const angle = clock * 0.74 + index * Math.PI * 2 / mist.length;
        wisp.position.set(Math.cos(angle) * 1.1, 0.22 + Math.sin(angle * 1.8) * 0.16, Math.sin(angle) * 1.48);
        wisp.rotation.y = -angle;
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
