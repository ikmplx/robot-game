import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createCranes } from "./actors";
import { createAnnex } from "./annex";
import { createGuardian } from "./boss";
import { createHero } from "./hero";
import { createHud } from "./hud";
import type { GameInput } from "./input";
import { createLevel, createWorkshop } from "./level";
import { createLibrarian } from "./librarian";
import { createPlayer, type Solid } from "./platformer";
import { arenas, bossArena, checkpointChoices, crateCourses, gate, hazard, lifts, maze, spawn, treasure, ziplines, type Arena } from "./route";
import { createTreasureChest } from "./treasure";

const step = 1 / 120;
const attackSeconds = 0.34;
const roomMask = 1;
const mazeMask = 2;

const prompts = {
  lessons: "К урокам",
  minigame: "Собрать мозаику",
  lift: "Подняться на лифте",
  zipline: "Зацепиться за трос",
  resetCrates: "Сбросить ящики",
  treasure: "Открыть сундук",
  librarian: "Поговорить с библиотекарем",
};

type Ride = { kind: "lift" | "zipline"; index: number; progress: number };
type Interaction = { kind: "lessons" | "minigame" | "treasure" | "librarian" }
  | { kind: "lift" | "zipline" | "resetCrates"; index: number };

function horizontalDistance(a: Vector3, b: Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export async function createPlatformerScene(engine: Engine, input: GameInput) {
  const scene = new Scene(engine);
  const roomBackground = Color4.FromHexString("#213251FF");
  const darkBackground = new Color4(0, 0, 0, 1);
  scene.clearColor = roomBackground.clone();
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = Color3.FromHexString("#263958");
  scene.fogStart = 20;
  scene.fogEnd = 80;

  const camera = new FreeCamera("Follow", Vector3.Zero(), scene);
  camera.fov = 0.87;
  camera.minZ = 0.1;
  camera.maxZ = 110;

  const ambientLight = new HemisphericLight("Ambient light", Vector3.Up(), scene);
  ambientLight.intensity = 0.84;
  ambientLight.groundColor = Color3.FromHexString("#677CAC");
  const sun = new DirectionalLight("Key light", new Vector3(0.46, -1, 0.3), scene);
  sun.position.set(-12, 22, 12);
  sun.intensity = 0.95;
  sun.diffuse = Color3.FromHexString("#FFE4BC");
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePoissonSampling = true;
  shadows.bias = 0.0015;
  shadows.normalBias = 0.025;
  shadows.setDarkness(0.26);

  const solids: Solid[] = [];
  const workshop = createWorkshop(scene, shadows);
  const { avatar, draw: drawHero } = await createHero(scene, workshop);
  const createCrane = createCranes(scene, workshop);
  const level = createLevel(scene, workshop, solids);
  const librarian = createLibrarian(scene, workshop, solids);
  const annex = createAnnex(scene, workshop, solids);
  const guardian = createGuardian(scene, workshop);
  const chest = createTreasureChest(scene, workshop, solids);
  const fights = arenas.map((zone, index) => ({
    zone,
    enemies: zone.enemies.map(([x, z]) => createCrane("Paper crane", new Vector3(x, zone.top, z))),
    setBarrier: level.fightBarriers[index],
    cleared: false,
  }));
  const scoutMeshes = avatar.getChildMeshes();
  annex.lightScout(scoutMeshes);
  const mazeMeshes = new Set([...annex.mazeMeshes, ...scoutMeshes]);
  for (const mesh of scene.meshes) mesh.layerMask = mazeMeshes.has(mesh) ? roomMask | mazeMask : roomMask;
  const [floorFight, shelfFight, upperFight] = fights;
  const cargo = crateCourses.map((course, index) => ({ ...level.cargo[index], course, placed: 0 }));
  const [floorCargo, upperCargo] = cargo;
  const elevators = lifts.map((track, index) => ({ track, platform: level.elevatorPlatforms[index], used: false }));
  const cables = ziplines.map((line, index) => ({
    ...line,
    length: Vector3.Distance(line.start, line.end),
    grip: level.zipGrips[index],
    used: false,
  }));
  const player = createPlayer(solids, spawn);
  const position = player.position;
  const cameraFocus = spawn.clone();
  const cameraTarget = Vector3.Zero();
  let cameraHeight = 5.55;
  let cameraBack = 8.4;
  let cameraSide = 0;

  let accumulator = 0;
  let clock = 0;
  let checkpoint = spawn;
  let health = 3;
  let collected = 0;
  let facing = 0;
  let moving = false;
  let swing = 0;
  let invulnerable = 0;
  let ride: Ride | null = null;
  let doorUnlocked = false;
  let doorProgress = 0;
  let openingChest = false;
  let chestProgress = 0;
  let treasureClaimed = false;
  let finished = false;
  let feedback = "";
  let feedbackTime = 0;
  let mazeView = 0;
  let mazeDarkness = 0;

  const hud = createHud({
    unlockDoor() { doorUnlocked = true; },
    restart: reset,
    selectCheckpoint,
    clearInput: input.reset,
  }, checkpointChoices);
  scene.onDisposeObservable.add(hud.dispose);

  function notify(message: string) {
    feedback = message;
    feedbackTime = 2.1;
  }

  function respawn() {
    player.reset(checkpoint);
    cameraFocus.copyFrom(checkpoint);
    cameraHeight = 5.55;
    cameraBack = 8.4;
    cameraSide = 0;
    mazeView = 0;
    mazeDarkness = 0;
    health = 3;
    invulnerable = 0;
    facing = 0;
    swing = 0;
    moving = false;
    ride = null;
    for (const fight of fights) {
      if (fight.cleared) continue;
      for (const enemy of fight.enemies) enemy.reset();
    }
    if (checkpoint === bossArena.checkpoint && !guardian.defeated) {
      guardian.reset();
      annex.setArenaEntrance(true);
    }
    input.reset();
  }

  function takeDamage() {
    if (invulnerable > 0) return false;
    health--;
    invulnerable = 0.9;
    if (health > 0) return false;
    respawn();
    notify("Возвращение к контрольной точке");
    return true;
  }

  function setCargo(board: typeof floorCargo, placed: boolean) {
    for (const crate of board.crates) crate.setPlaced(placed);
    board.placed = placed ? board.crates.length : 0;
    board.setBarrier(!placed);
  }

  function startAt(point: Vector3) {
    checkpoint = point;
    accumulator = 0;
    finished = false;
    doorUnlocked = point.z > gate.z;
    doorProgress = doorUnlocked ? 1 : 0;
    openingChest = false;
    chestProgress = 0;
    feedbackTime = 0;
    annex.reset();
    guardian.reset();
    for (const fight of fights) {
      fight.cleared = point.z > fight.zone.back;
      fight.setBarrier(!fight.cleared);
      if (fight.cleared) for (const enemy of fight.enemies) enemy.health = 0;
    }
    for (const board of cargo) setCargo(board, point.z > board.course.back);
    for (const elevator of elevators) {
      elevator.used = point.z >= elevator.track.arrival.z;
      elevator.platform.move(elevator.used ? elevator.track.upper : elevator.track.lower);
    }
    for (const cable of cables) {
      cable.used = point.z >= cable.end.z;
      cable.grip.position.copyFrom(cable.used ? cable.end : cable.start);
    }
    level.setDoor(doorProgress, doorUnlocked ? 3 : hud.countStars());
    respawn();
  }

  function reset() {
    collected = 0;
    treasureClaimed = false;
    for (const { coin } of level.coins) coin.setEnabled(true);
    hud.reset();
    startAt(spawn);
  }

  function selectCheckpoint(index: number) {
    const { label, position: point } = checkpointChoices[index];
    hud.resetMosaic();
    startAt(point);
    notify(label);
  }

  function interaction(): Interaction | null {
    if (finished || openingChest || !player.grounded || ride) return null;
    if (Math.abs(position.y - librarian.position.y) < 0.35 && horizontalDistance(position, librarian.position) < 2.2) {
      return { kind: "librarian" };
    }
    if (guardian.defeated && position.y === treasure.y && position.z > bossArena.back
      && position.z < treasure.z && horizontalDistance(position, treasure) < 2.75) return { kind: "treasure" };
    if (cables[1].used && position.y === gate.y && position.z >= gate.z - 2.65
      && position.z < gate.z && Math.abs(position.x - gate.x) < 2.65 && !doorUnlocked) {
      return { kind: hud.countStars() >= 3 ? "minigame" : "lessons" };
    }
    for (const [index, { track, used }] of elevators.entries()) {
      const ready = index === 0 ? floorCargo.placed === floorCargo.crates.length : cables[0].used;
      if (ready && !used && position.y === track.lower && Math.abs(position.x - track.x) < track.width / 2
        && Math.abs(position.z - track.z) < track.depth / 2) return { kind: "lift", index };
    }
    for (const [index, cable] of cables.entries()) {
      const ready = index === 0 ? shelfFight.cleared : upperCargo.placed === upperCargo.crates.length;
      if (ready && !cable.used && position.y === cable.start.y && horizontalDistance(position, cable.start) < 1.45) {
        return { kind: "zipline", index };
      }
    }
    for (const [index, { course, crates, placed }] of cargo.entries()) {
      if (placed < crates.length && position.y === course.top && position.z >= course.front
        && position.z < course.back && Math.abs(position.x - course.x) < course.halfWidth
        && crates.some((crate) => crate.moved)) return { kind: "resetCrates", index };
    }
    return null;
  }

  function interact() {
    const action = interaction();
    switch (action?.kind) {
      case "librarian":
        facing = Math.atan2(librarian.position.x - position.x, librarian.position.z - position.z);
        moving = false;
        swing = 0;
        hud.talkToLibrarian();
        break;
      case "lessons":
        hud.showLessons();
        break;
      case "minigame":
        hud.showMinigame();
        break;
      case "treasure":
        openingChest = true;
        swing = 0;
        moving = false;
        input.reset();
        break;
      case "lift": {
        const { x, lower, z } = elevators[action.index].track;
        ride = { kind: "lift", index: action.index, progress: 0 };
        player.reset(new Vector3(x, lower, z));
        facing = 0;
        swing = 0;
        moving = false;
        break;
      }
      case "zipline": {
        const { start, end } = cables[action.index];
        ride = { kind: "zipline", index: action.index, progress: 0 };
        player.reset(start);
        facing = Math.atan2(end.x - start.x, end.z - start.z);
        swing = 0;
        moving = false;
        break;
      }
      case "resetCrates": {
        const board = cargo[action.index];
        player.reset(board.course.restart);
        setCargo(board, false);
        notify("Ящики возвращены на исходные места");
        break;
      }
    }
  }

  function activeFight() {
    return fights.find(({ zone, cleared }) => !cleared && position.z >= zone.front - 0.18
      && position.z <= zone.back && Math.abs(position.x - zone.x) < zone.halfWidth + 0.2
      && Math.abs(position.y - zone.top) < 1.55);
  }

  function moveEnemy(target: Vector3, zone: Arena, dx: number, dz: number) {
    const xLimit = zone.halfWidth - 0.62;
    target.x = Math.max(zone.x - xLimit, Math.min(zone.x + xLimit, target.x + dx));
    target.z = Math.max(zone.front + 0.55, Math.min(zone.back - 0.65, target.z + dz));
  }

  function strikeInRange(target: Vector3, range: number) {
    const distance = horizontalDistance(target, position);
    const forward = (target.x - position.x) * Math.sin(facing) + (target.z - position.z) * Math.cos(facing);
    return distance <= range && (distance <= 0.72 || forward >= distance * 0.21)
      && Math.abs(target.y - position.y) <= 1.15;
  }

  function attack() {
    swing = attackSeconds;
    if (annex.strike(position, strikeInRange)) notify("Свеча зажжена");
    if (guardian.strike(strikeInRange) && guardian.defeated) {
      annex.setArenaExit(true);
      annex.setArenaEntrance(true);
      notify("Хранитель повержен");
    }
    const fight = activeFight();
    if (!fight) return;
    for (const enemy of fight.enemies) {
      const target = enemy.root.position;
      if (enemy.health <= 0 || !strikeInRange(target, 2.03)) continue;

      enemy.health -= 1;
      enemy.windup = 0;
      enemy.cooldown = 0.32;
      enemy.stagger = 0.25;
      const distance = horizontalDistance(target, position);
      if (distance > 0.01) {
        const knockback = 0.43 / distance;
        moveEnemy(target, fight.zone, (target.x - position.x) * knockback, (target.z - position.z) * knockback);
      }
    }
    if (fight.enemies.every((enemy) => enemy.health === 0)) {
      fight.cleared = true;
      fight.setBarrier(false);
      notify(fight.zone.exitMessage);
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
          if (distance < 1.45 && Math.abs(position.y - target.y) < 0.8 && takeDamage()) return;
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

  function updateRide(active: Ride, dt: number) {
    if (active.kind === "lift") {
      const elevator = elevators[active.index];
      const { lower, upper, arrival } = elevator.track;
      active.progress = Math.min(upper - lower, active.progress + 3.7 * dt);
      position.y = lower + active.progress;
      elevator.platform.move(position.y);
      if (active.progress === upper - lower) {
        elevator.used = true;
        finishRide(arrival);
      }
    } else {
      const cable = cables[active.index];
      active.progress = Math.min(1, active.progress + 9.2 * dt / cable.length);
      Vector3.LerpToRef(cable.start, cable.end, active.progress, position);
      cable.grip.position.copyFrom(position);
      if (active.progress === 1) {
        cable.used = true;
        finishRide(cable.end);
      }
    }
  }

  function finishRide(arrival: Vector3) {
    checkpoint = arrival;
    player.reset(position);
    ride = null;
  }

  function updateCheckpoint() {
    if (!player.grounded) return;
    if (checkpoint === cables[1].end && doorUnlocked && position.y === gate.y && position.z >= gate.z + 1.05) {
      checkpoint = maze.checkpoint;
      notify("За дверью — Свечной зал");
    }
    if (checkpoint === maze.checkpoint && position.y === bossArena.top && position.z >= maze.back + 1.25) {
      checkpoint = bossArena.checkpoint;
      health = 3;
      notify("Хранитель ждёт впереди");
    }
    for (const { zone } of [floorFight, upperFight]) {
      const previous = zone.top === 0 ? spawn : elevators[1].track.arrival;
      if (checkpoint === previous && position.y === zone.top && position.z >= zone.front
        && position.z <= zone.back && Math.abs(position.x - zone.x) < zone.halfWidth) {
        checkpoint = zone.checkpoint;
      }
    }
    for (const [index, { course }] of cargo.entries()) {
      const fight = index === 0 ? floorFight : upperFight;
      if (fight.cleared && checkpoint === fight.zone.checkpoint && position.y === course.top
        && position.z >= course.front && position.z < course.back && Math.abs(position.x - course.x) < course.halfWidth) {
        checkpoint = course.restart;
      }
    }
  }

  function updateGuardian(dt: number) {
    if (checkpoint !== bossArena.checkpoint || guardian.defeated) return;
    if (!guardian.active && position.z > bossArena.front + 0.61 && position.y === bossArena.top) {
      guardian.start();
      annex.setArenaEntrance(false);
    }
    if (guardian.update(dt, position)) takeDamage();
  }

  function updateCargo() {
    for (const [index, board] of cargo.entries()) {
      const fight = index === 0 ? floorFight : upperFight;
      if (!fight.cleared || position.y !== board.course.top || board.placed === board.crates.length) continue;
      for (const crate of board.crates) crate.checkTarget(player.overlapsSolid);
      board.placed = board.crates.filter((crate) => crate.placed).length;
      if (board.placed === board.crates.length) {
        board.setBarrier(false);
        notify(board.course.exitMessage);
      }
    }
  }

  function simulate(dt: number, x: number, z: number) {
    swing = Math.max(0, swing - dt);
    invulnerable = Math.max(0, invulnerable - dt);
    feedbackTime = Math.max(0, feedbackTime - dt);
    doorProgress = Math.min(1, doorProgress + (doorUnlocked ? dt * 1.55 : 0));

    if (openingChest) {
      chestProgress += dt;
      if (chestProgress >= 1.18) {
        if (!treasureClaimed) collected += chest.amount;
        treasureClaimed = true;
        finished = true;
      }
      return;
    }

    if (ride) {
      updateRide(ride, dt);
    } else {
      moving = x !== 0 || z !== 0;
      if (moving) facing = Math.atan2(x, z);
      player.update(dt, x, z);
    }

    const touchesDanger = position.y <= 0 && position.z > hazard.front && position.z < hazard.back;
    if (!ride && (touchesDanger || position.y < checkpoint.y - 1.45)) {
      respawn();
      notify("Возвращение к контрольной точке");
      return;
    }

    if (!ride) {
      updateCheckpoint();
      updateMonsters(dt);
      updateCargo();
      updateGuardian(dt);
    }
    for (const { coin, position: center, minimumY } of level.coins) {
      if (coin.isEnabled() && position.y >= minimumY && horizontalDistance(position, center) < 0.8
        && Math.abs(position.y + 0.7 - center.y) < 1.12) {
        coin.setEnabled(false);
        collected += 1;
      }
    }
  }

  function objective() {
    if (finished) return "Сокровище получено";
    if (openingChest) return treasureClaimed ? "Сундук открыт" : `Награда · +${chest.amount} монет`;
    if (guardian.defeated) return "Хранитель повержен · Откройте сундук";
    if (guardian.active) return guardian.hint;
    if (checkpoint === bossArena.checkpoint) return "Пройдите к арене Хранителя";
    if (checkpoint === maze.checkpoint) return "Найдите выход · Зажигайте свечи мечом";
    if (doorUnlocked) return "Пройдите в Свечной зал";
    if (ride) return ride.kind === "lift" ? "Лифт поднимается" : "Переправа по тросу";
    if (cables[1].used) {
      return hud.countStars() < 3 ? "Соберите 3 звезды для двери" : "Соберите мозаику у двери";
    }
    if (upperCargo.placed === upperCargo.crates.length) return "Спуститесь по тросу к двери";
    if (upperFight.cleared) return `Верхний склад · Ящики ${upperCargo.placed} / ${upperCargo.crates.length}`;
    if (checkpoint === upperFight.zone.checkpoint) return "Победите бумажных журавликов на втором этаже";
    if (elevators[1].used) return "Второй этаж · Перепрыгните по платформам";
    if (cables[0].used) return "Дойдите до лифта на второй этаж";
    if (shelfFight.cleared) return "Переберитесь на другую сторону по тросу";
    if (elevators[0].used) return "Победите бумажных журавликов на полке";
    if (floorCargo.placed === floorCargo.crates.length) return "Дойдите до лифта на полку";
    if (floorFight.cleared) return `Нижний склад · Ящики ${floorCargo.placed} / ${floorCargo.crates.length}`;
    if (checkpoint === floorFight.zone.checkpoint) return "Победите бумажных журавликов на полу";
    return "Перепрыгните по кубам";
  }

  function draw(dt: number) {
    const inMaze = annex.contains(position);
    mazeDarkness = Math.max(0, Math.min(1, mazeDarkness + (inMaze ? dt : -dt) / 0.95));
    const darkness = mazeDarkness * mazeDarkness * (3 - 2 * mazeDarkness);
    const fullyDark = mazeDarkness === 1;
    const nearMaze = position.z >= maze.front - 7 && position.z < maze.back + 5
      && Math.abs(position.y - maze.top) < 2.7;
    const scoutLit = annex.draw(clock, position, nearMaze);
    avatar.setEnabled(!fullyDark || scoutLit);
    avatar.position.copyFrom(position);
    avatar.rotation.y = facing;
    drawHero(clock, moving && !ride && !finished, player.grounded || ride?.kind === "lift",
      swing / attackSeconds, invulnerable > 0, ride?.kind === "zipline");
    for (const fight of fights) for (const enemy of fight.enemies) enemy.draw(clock);
    guardian.draw(clock, position);
    librarian.draw(clock, dt, position);
    chest.draw(chestProgress);
    for (const [index, { coin, position: center }] of level.coins.entries()) {
      if (!coin.isEnabled()) continue;
      coin.rotation.y = clock * 2.25 + index * 0.4;
      coin.position.y = center.y + Math.sin(clock * 3.2 + index * 0.65) * 0.105;
    }
    level.setDoor(doorProgress * doorProgress * (3 - 2 * doorProgress), doorUnlocked ? 3 : hud.countStars());

    const follow = 1 - Math.exp(-dt * 8);
    mazeView += ((inMaze ? 1 : 0) - mazeView) * follow;
    camera.layerMask = fullyDark ? mazeMask : roomMask;
    Color4.LerpToRef(roomBackground, darkBackground, darkness, scene.clearColor);
    scene.fogMode = fullyDark ? Scene.FOGMODE_NONE : Scene.FOGMODE_LINEAR;
    scene.fogStart = 20 + 90 * darkness;
    scene.fogEnd = 80 + 90 * darkness;
    ambientLight.intensity = 0.84 * (1 - darkness);
    sun.intensity = 0.95 * (1 - darkness);
    Vector3.LerpToRef(cameraFocus, position, follow, cameraFocus);
    const narrow = engine.getRenderWidth() / engine.getRenderHeight() < 0.95;
    camera.fovMode = narrow ? FreeCamera.FOVMODE_HORIZONTAL_FIXED : FreeCamera.FOVMODE_VERTICAL_FIXED;
    const viewingCargo = crateCourses.some(({ x, top, front, back, halfWidth }) => Math.abs(position.y - top) < 2.3
      && position.z >= front - 2 && position.z <= back + 0.5 && Math.abs(position.x - x) < halfWidth + 0.4);
    const atMazeEntrance = position.z > gate.z + 0.85 && position.z < maze.front
      && Math.abs(position.x - gate.x) < 3.3 && Math.abs(position.y - gate.y) < 2.3;
    const atArena = position.z >= bossArena.checkpoint.z && position.z < bossArena.back
      && Math.abs(position.x - bossArena.x) < bossArena.halfWidth && Math.abs(position.y - bossArena.top) < 2.3;
    const height = inMaze ? 15.75 : viewingCargo ? 11.25 : atArena ? 9.8 : atMazeEntrance ? 9 : 5.55;
    const back = atMazeEntrance ? 5.7 : atArena ? 8.75 : 8.4;
    cameraHeight += (height - cameraHeight) * follow;
    cameraBack += (back - cameraBack) * follow;
    cameraSide += ((atArena ? 2.5 : 0) - cameraSide) * follow;
    const direction = ride?.kind === "zipline" ? Math.sin(facing) : 0;
    camera.position.set(cameraFocus.x - direction * 2.5 + cameraSide, cameraFocus.y + cameraHeight, cameraFocus.z - cameraBack + 5.4 * mazeView);
    cameraTarget.set(cameraFocus.x + direction * 2.4, cameraFocus.y + 0.42, cameraFocus.z + 4.1 - 2.6 * mazeView);
    camera.setTarget(cameraTarget);

    const available = interaction();
    hud.update({
      health, coins: collected, totalCoins: level.coins.length + chest.amount, objective: objective(),
      bossHealth: guardian.active ? guardian.health : null, bossMaxHealth: guardian.maxHealth,
      checkpointIndex: checkpointChoices.findIndex(({ position }) => position === checkpoint),
      interaction: available ? prompts[available.kind] : "", feedback: feedbackTime > 0 && !finished ? feedback : "", finished,
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
          if (!ride && !openingChest) {
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
    } else if (hud.travelOpen) {
      if (input.takeInteract()) hud.dismissTravel();
    } else {
      input.reset();
    }
    draw(dt);
  });
  return scene;
}
