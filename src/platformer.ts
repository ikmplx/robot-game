import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface Solid {
  min: Vector3;
  max: Vector3;
  push?: (axis: "x" | "z", distance: number) => number;
}

export function solidsOverlap(a: Solid, b: Solid) {
  return a.min.x < b.max.x && a.max.x > b.min.x
    && a.min.y < b.max.y && a.max.y > b.min.y
    && a.min.z < b.max.z && a.max.z > b.min.z;
}

export function pushSolid(
  body: Solid,
  solids: Solid[],
  bounds: { min: Vector3; max: Vector3 },
  axis: "x" | "z",
  distance: number,
) {
  const other = axis === "x" ? "z" : "x";
  let travel = distance > 0
    ? Math.min(distance, bounds.max[axis] - body.max[axis])
    : Math.max(distance, bounds.min[axis] - body.min[axis]);

  for (const solid of solids) {
    if (solid === body || body.max.y <= solid.min.y || body.min.y >= solid.max.y
      || body.max[other] <= solid.min[other] || body.min[other] >= solid.max[other]) continue;
    if (distance > 0 && body.max[axis] <= solid.min[axis]) {
      travel = Math.min(travel, solid.min[axis] - body.max[axis]);
    } else if (distance < 0 && body.min[axis] >= solid.max[axis]) {
      travel = Math.max(travel, solid.max[axis] - body.min[axis]);
    }
  }
  body.min[axis] += travel;
  body.max[axis] += travel;
  return travel;
}

const playerRadius = 0.39;
const playerHeight = 1.55;
const speed = 5.8;
const gravity = 18;
const jumpSpeed = 8.9;
const jumpBufferSeconds = 0.13;
const coyoteSeconds = 0.1;

export function createPlayer(solids: Solid[], spawn: Vector3) {
  const position = spawn.clone();
  let verticalSpeed = 0;
  let coyoteTime = coyoteSeconds;
  let jumpBuffer = 0;
  let grounded = true;

  function overlaps(axis: "x" | "z", solid: Solid) {
    return position[axis] + playerRadius > solid.min[axis]
      && position[axis] - playerRadius < solid.max[axis];
  }

  function moveHorizontal(axis: "x" | "z", other: "x" | "z", distance: number) {
    if (distance === 0) return;
    const previous = position[axis];
    let next = previous + distance;
    let obstacle: Solid | undefined;

    for (const solid of solids) {
      if (position.y >= solid.max.y || position.y + playerHeight <= solid.min.y
        || !overlaps(other, solid)) continue;

      const nearEdge = solid.min[axis] - playerRadius;
      const farEdge = solid.max[axis] + playerRadius;
      if (distance > 0 && previous <= nearEdge && next > nearEdge) {
        next = nearEdge;
        obstacle = solid;
      } else if (distance < 0 && previous >= farEdge && next < farEdge) {
        next = farEdge;
        obstacle = solid;
      }
    }
    if (grounded && obstacle?.push) next += obstacle.push(axis, (previous + distance - next) * 0.62);
    position[axis] = next;
  }

  function moveVertical(dt: number) {
    verticalSpeed -= gravity * dt;
    const previous = position.y;
    const proposed = previous + verticalSpeed * dt;
    let next = proposed;
    grounded = false;

    for (const solid of solids) {
      if (!overlaps("x", solid) || !overlaps("z", solid)) continue;

      const ceiling = solid.min.y - playerHeight;
      if (verticalSpeed > 0 && previous <= ceiling && next >= ceiling) {
        next = ceiling;
      } else if (verticalSpeed < 0 && previous >= solid.max.y && next <= solid.max.y) {
        next = solid.max.y;
        grounded = true;
      }
    }
    if (next !== proposed || grounded) verticalSpeed = 0;
    position.y = next;
  }

  return {
    position,
    get grounded() { return grounded; },
    overlapsSolid(solid: Solid) {
      return overlaps("x", solid) && overlaps("z", solid)
        && position.y < solid.max.y && position.y + playerHeight > solid.min.y;
    },
    queueJump() { jumpBuffer = jumpBufferSeconds; },
    update(dt: number, x: number, z: number) {
      if (jumpBuffer > 0 && (grounded || coyoteTime > 0)) {
        verticalSpeed = jumpSpeed;
        grounded = false;
        coyoteTime = 0;
        jumpBuffer = 0;
      }
      jumpBuffer = Math.max(0, jumpBuffer - dt);
      moveHorizontal("x", "z", x * speed * dt);
      moveHorizontal("z", "x", z * speed * dt);
      moveVertical(dt);
      coyoteTime = grounded ? coyoteSeconds : Math.max(0, coyoteTime - dt);
    },
    reset(at = spawn) {
      position.copyFrom(at);
      verticalSpeed = 0;
      coyoteTime = coyoteSeconds;
      jumpBuffer = 0;
      grounded = true;
    },
  };
}
