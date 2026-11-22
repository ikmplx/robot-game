import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface Solid {
  min: Vector3;
  max: Vector3;
}

const playerRadius = 0.39;
const playerHeight = 1.55;
const speed = 5.8;
const gravity = 18;
const jumpSpeed = 7.6;
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

    for (const solid of solids) {
      if (position.y >= solid.max.y || position.y + playerHeight <= solid.min.y
        || !overlaps(other, solid)) continue;

      const nearEdge = solid.min[axis] - playerRadius;
      const farEdge = solid.max[axis] + playerRadius;
      if (distance > 0 && previous <= nearEdge) next = Math.min(next, nearEdge);
      if (distance < 0 && previous >= farEdge) next = Math.max(next, farEdge);
    }
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
    reset() {
      position.copyFrom(spawn);
      verticalSpeed = 0;
      coyoteTime = coyoteSeconds;
      jumpBuffer = 0;
      grounded = true;
    },
  };
}
