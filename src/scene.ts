import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createActors } from "./actors";
import { createHud } from "./hud";
import type { GameInput } from "./input";
import { createLevel, createWorkshop, route } from "./level";
import { createPlayer, type Solid } from "./platformer";

const step = 1 / 120;
const attackSeconds = 0.34;

const prompts = {
  lessons: "К урокам",
  minigame: "Собрать мозаику",
  lift: "Подняться на полку",
  resetCrates: "Сбросить кубы",
};

function horizontalDistance(a: Vector3, b: Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function createPlatformerScene(engine: Engine, input: GameInput) {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#5D6B77FF");
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = Color3.FromHexString("#697783");
  scene.fogStart = 15;
  scene.fogEnd = 58;

  const camera = new FreeCamera("Follow", Vector3.Zero(), scene);
  camera.fov = 0.87;
  camera.minZ = 0.1;
  camera.maxZ = 100;

  const ambientLight = new HemisphericLight("Ambient light", Vector3.Up(), scene);
  ambientLight.intensity = 0.78;
  ambientLight.groundColor = Color3.FromHexString("#62788F");
  const sun = new DirectionalLight("Key light", new Vector3(0.46, -1, 0.3), scene);
  sun.position.set(-12, 22, 12);
  sun.intensity = 0.95;
  sun.diffuse = Color3.FromHexString("#FDE8D8");
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePoissonSampling = true;
  shadows.bias = 0.001;
  shadows.setDarkness(0.26);

  const solids: Solid[] = [];
  const workshop = createWorkshop(scene, shadows);
  const level = createLevel(scene, workshop, solids);
  const { avatar, drawScout, monster } = createActors(scene, workshop);
  const floorFight = {
    zone: route.arena,
    enemies: [
      monster("Floor monster 1", new Vector3(-1.7, 0, 18.9)),
      monster("Floor monster 2", new Vector3(1.8, 0, 21.2)),
    ],
    setBarrier: level.setArenaBarrier,
    cleared: false,
  };
  const shelfFight = {
    zone: route.shelf,
    enemies: [
      monster("Shelf monster 1", new Vector3(-1.55, route.shelf.top, 38.3)),
      monster("Shelf monster 2", new Vector3(1.75, route.shelf.top, 40.45)),
    ],
    setBarrier: level.setShelfBarrier,
    cleared: false,
  };
  const fights = [floorFight, shelfFight];
  const player = createPlayer(solids, route.spawn);
  const position = player.position;
  const liftCenter = new Vector3(0, route.lift.lower, route.lift.z);
  const puzzleStart = new Vector3(0, 0, 24.45);
  const cameraFocus = route.spawn.clone();
  const cameraTarget = Vector3.Zero();

  let accumulator = 0;
  let clock = 0;
  let checkpoint = route.spawn;
  let health = 3;
  let collected = 0;
  let facing = 0;
  let moving = false;
  let swing = 0;
  let invulnerable = 0;
  let liftY: number = route.lift.lower;
  let ridingLift = false;
  let placedCrates = 0;
  let doorUnlocked = false;
  let doorProgress = 0;
  let finished = false;
  let feedback = "";
  let feedbackTime = 0;

  const hud = createHud({
    unlockDoor() { doorUnlocked = true; },
    restart: reset,
    clearInput: input.reset,
  });
  scene.onDisposeObservable.add(hud.dispose);

  function notify(message: string) {
    feedback = message;
    feedbackTime = 2.1;
  }

  function respawn() {
    player.reset(checkpoint);
    cameraFocus.copyFrom(checkpoint);
    health = 3;
    invulnerable = 0;
    facing = 0;
    swing = 0;
    moving = false;
    ridingLift = false;
    for (const fight of fights) {
      if (fight.cleared) continue;
      for (const enemy of fight.enemies) enemy.reset();
    }
    liftY = checkpoint === route.shelf.checkpoint ? route.lift.upper : route.lift.lower;
    level.moveLift(liftY);
    input.reset();
  }

  function resetCrates() {
    for (const crate of level.crates) crate.reset();
    placedCrates = 0;
    level.setPuzzleBarrier(true);
  }

  function reset() {
    checkpoint = route.spawn;
    collected = 0;
    finished = false;
    doorUnlocked = false;
    doorProgress = 0;
    feedbackTime = 0;
    for (const fight of fights) {
      fight.cleared = false;
      fight.setBarrier(true);
    }
    resetCrates();
    for (const { coin } of level.coins) coin.setEnabled(true);
    level.setDoor(0, 0);
    hud.reset();
    respawn();
  }

  function interaction(): keyof typeof prompts | null {
    if (finished || !player.grounded || ridingLift) return null;
    if (shelfFight.cleared && position.y === route.shelf.top && position.z >= route.gateZ - 2.25
      && position.z < route.gateZ && Math.abs(position.x) < 2.65 && !doorUnlocked) {
      return hud.countStars() >= 3 ? "minigame" : "lessons";
    }
    if (placedCrates === level.crates.length && liftY === route.lift.lower && position.y === liftY
      && Math.abs(position.x) < route.lift.width / 2 && Math.abs(position.z - route.lift.z) < route.lift.depth / 2) {
      return "lift";
    }
    if (floorFight.cleared && placedCrates < level.crates.length && position.y === 0
      && position.z >= route.puzzle.front && position.z < route.puzzle.back
      && Math.abs(position.x) < route.puzzle.halfWidth && level.crates.some((crate) => crate.moved)) {
      return "resetCrates";
    }
    return null;
  }

  function interact() {
    switch (interaction()) {
      case "lessons":
        hud.showLessons();
        break;
      case "minigame":
        hud.showMinigame();
        break;
      case "lift":
        ridingLift = true;
        player.reset(liftCenter);
        facing = 0;
        swing = 0;
        break;
      case "resetCrates":
        player.reset(puzzleStart);
        resetCrates();
        notify("Кубы возвращены");
        break;
    }
  }

  function activeFight() {
    return fights.find(({ zone, cleared }) => !cleared && position.z >= zone.front - 0.18
      && position.z <= zone.back && Math.abs(position.x) < zone.halfWidth + 0.2
      && Math.abs(position.y - zone.top) < 1.55);
  }

  function moveEnemy(target: Vector3, zone: typeof route.arena | typeof route.shelf, dx: number, dz: number) {
    const xLimit = zone.halfWidth - 0.62;
    target.x = Math.max(-xLimit, Math.min(xLimit, target.x + dx));
    target.z = Math.max(zone.front + 0.55, Math.min(zone.back - 0.65, target.z + dz));
  }

  function attack() {
    swing = attackSeconds;
    const fight = activeFight();
    if (!fight) return;
    for (const enemy of fight.enemies) {
      const target = enemy.root.position;
      const distance = horizontalDistance(target, position);
      const forward = (target.x - position.x) * Math.sin(facing) + (target.z - position.z) * Math.cos(facing);
      if (enemy.health <= 0 || distance > 2.03 || (forward < distance * 0.21 && distance > 0.72)
        || Math.abs(target.y - position.y) > 1.15) continue;

      enemy.health -= 1;
      enemy.windup = 0;
      enemy.cooldown = 0.32;
      enemy.stagger = 0.25;
      if (distance > 0.01) {
        const knockback = 0.43 / distance;
        moveEnemy(target, fight.zone, (target.x - position.x) * knockback, (target.z - position.z) * knockback);
      }
    }
    if (fight.enemies.every((enemy) => enemy.health === 0)) {
      fight.cleared = true;
      fight.setBarrier(false);
      notify(fight === floorFight ? "Проход к кубам открыт" : "Проход к двери открыт");
    }
  }

  function updateMonsters(dt: number) {
    const fight = activeFight();
    for (const inactive of fights) {
      if (inactive !== fight) for (const enemy of inactive.enemies) enemy.windup = 0;
    }
    if (!fight) return;
    for (const enemy of fight.enemies) {
      if (enemy.health <= 0) continue;
      enemy.stagger = Math.max(0, enemy.stagger - dt);
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      if (enemy.stagger > 0) continue;

      const target = enemy.root.position;
      const dx = position.x - target.x;
      const dz = position.z - target.z;
      const distance = Math.hypot(dx, dz);
      enemy.root.rotation.y = Math.atan2(dx, dz);

      if (enemy.windup > 0) {
        enemy.windup = Math.max(0, enemy.windup - dt);
        if (enemy.windup === 0) {
          enemy.cooldown = 0.65;
          if (distance < 1.45 && Math.abs(position.y - target.y) < 0.8 && invulnerable === 0) {
            health -= 1;
            invulnerable = 0.9;
            if (health === 0) {
              respawn();
              notify("Возвращение к контрольной точке");
              return;
            }
          }
        }
      } else if (distance < 1.06 && enemy.cooldown === 0) {
        enemy.windup = 0.42;
      } else if (distance >= 0.76) {
        const separation = fight.enemies.some((other) => other !== enemy && other.health > 0
          && horizontalDistance(other.root.position, target) < 0.74 && horizontalDistance(other.root.position, position) < distance);
        const stride = (separation ? 0.75 : 2.05) * dt / distance;
        moveEnemy(target, fight.zone, dx * stride, dz * stride);
      }
    }
  }

  function simulate(dt: number, x: number, z: number) {
    swing = Math.max(0, swing - dt);
    invulnerable = Math.max(0, invulnerable - dt);
    feedbackTime = Math.max(0, feedbackTime - dt);
    doorProgress = Math.min(1, doorProgress + (doorUnlocked ? dt * 1.55 : 0));

    if (ridingLift) {
      liftY = Math.min(route.lift.upper, liftY + 3.45 * dt);
      level.moveLift(liftY);
      position.y = liftY;
      if (liftY === route.lift.upper) {
        ridingLift = false;
        checkpoint = route.shelf.checkpoint;
      }
    } else {
      moving = x !== 0 || z !== 0;
      if (moving) facing = Math.atan2(x, z);
      player.update(dt, x, z);
    }

    const { hazard, arena } = route;
    const touchesDanger = position.y <= 0 && position.z > hazard.front && position.z < hazard.back;
    const fellFromShelf = checkpoint === route.shelf.checkpoint && position.y < 0.8;
    if (touchesDanger || fellFromShelf || position.y < -2) {
      respawn();
      notify("Возвращение к контрольной точке");
      return;
    }

    if (checkpoint === route.spawn && player.grounded && position.y === arena.top
      && position.z >= arena.front && position.z < arena.back && Math.abs(position.x) < arena.halfWidth) {
      checkpoint = arena.checkpoint;
    }
    updateMonsters(dt);

    if (floorFight.cleared && placedCrates < level.crates.length) {
      for (const crate of level.crates) crate.checkTarget(player.overlapsSolid);
      placedCrates = level.crates.filter((crate) => crate.placed).length;
      if (placedCrates === level.crates.length) {
        level.setPuzzleBarrier(false);
        notify("Лифт доступен");
      }
    }
    for (const { coin, position: center } of level.coins) {
      if (coin.isEnabled() && horizontalDistance(position, center) < 0.8
        && Math.abs(position.y + 0.7 - center.y) < 1.12) {
        coin.setEnabled(false);
        collected += 1;
      }
    }

    if (player.grounded && doorUnlocked && position.y === route.goal.y
      && horizontalDistance(position, route.goal) < 0.95) finished = true;
  }

  function objective() {
    if (finished) return "Выход достигнут";
    if (doorUnlocked) return "Пройдите к выходу";
    if (ridingLift) return "Лифт поднимается на полку";
    if (checkpoint === route.shelf.checkpoint) {
      if (!shelfFight.cleared) return "Победите монстров на полке";
      return hud.countStars() < 3 ? "Соберите 3 звезды для двери" : "Соберите мозаику у двери";
    }
    if (placedCrates === level.crates.length) return "Поднимитесь на полку";
    if (floorFight.cleared) return `Толкайте кубы на метки · ${placedCrates} / ${level.crates.length}`;
    if (checkpoint === route.arena.checkpoint) return "Победите монстров на полу";
    return "Перепрыгните по кубам";
  }

  function draw(dt: number) {
    avatar.position.copyFrom(position);
    avatar.rotation.y = facing;
    drawScout(clock, moving && !ridingLift && !finished, player.grounded,
      swing / attackSeconds, invulnerable > 0);
    for (const fight of fights) for (const enemy of fight.enemies) enemy.draw(clock);
    for (const [index, { coin, position: center }] of level.coins.entries()) {
      if (!coin.isEnabled()) continue;
      coin.rotation.y = clock * 2.25 + index * 0.4;
      coin.position.y = center.y + Math.sin(clock * 3.2 + index * 0.65) * 0.105;
    }
    level.setDoor(doorProgress * doorProgress * (3 - 2 * doorProgress), hud.countStars());

    Vector3.LerpToRef(cameraFocus, position, 1 - Math.exp(-dt * 8), cameraFocus);
    const narrow = engine.getRenderWidth() / engine.getRenderHeight() < 0.95;
    camera.fovMode = narrow ? FreeCamera.FOVMODE_HORIZONTAL_FIXED : FreeCamera.FOVMODE_VERTICAL_FIXED;
    camera.position.set(cameraFocus.x, cameraFocus.y + 5.65, cameraFocus.z - 7.45);
    cameraTarget.set(cameraFocus.x, cameraFocus.y + 0.42, cameraFocus.z + 3.2);
    camera.setTarget(cameraTarget);

    const available = interaction();
    hud.update({
      health, coins: collected, totalCoins: level.coins.length, objective: objective(),
      interaction: available ? prompts[available] : "", feedback: feedbackTime > 0 && !finished ? feedback : "", finished,
    });
  }

  reset();
  draw(0);
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (!hud.paused) {
      if (input.takeRestart()) reset();
      if (!finished) {
        if (input.takeInteract()) interact();
        if (!hud.paused) {
          const { x, z } = input.movement();
          if (!ridingLift) {
            if (x || z) facing = Math.atan2(x, z);
            if (input.takeJump()) player.queueJump();
            if (input.takeAttack() && swing === 0) attack();
          } else {
            input.takeJump();
            input.takeAttack();
          }
          clock += dt;
          accumulator += dt;
          while (accumulator >= step && !finished) {
            accumulator -= step;
            simulate(step, x, z);
          }
        }
      }
    } else {
      input.reset();
    }
    draw(dt);
  });
  return scene;
}
