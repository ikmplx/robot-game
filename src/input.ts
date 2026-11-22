const movementKeys: Readonly<Record<string, [number, number]>> = {
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
};

export function createInput(stick: HTMLElement, jump: HTMLButtonElement, restart: HTMLButtonElement) {
  const listeners = new AbortController();
  const { signal } = listeners;
  const keys = new Set<string>();
  const knob = stick.querySelector("span")!;
  let stickPointer: number | null = null;
  let stickX = 0;
  let stickZ = 0;
  let jumpRequested = false;
  let restartRequested = false;

  function releaseStick() {
    const pointer = stickPointer;
    stickPointer = null;
    if (pointer !== null && stick.hasPointerCapture(pointer)) stick.releasePointerCapture(pointer);
    stickX = 0;
    stickZ = 0;
    knob.style.transform = "";
  }

  function reset() {
    keys.clear();
    releaseStick();
    jumpRequested = false;
    restartRequested = false;
  }

  function moveStick(event: PointerEvent) {
    const bounds = stick.getBoundingClientRect();
    const radius = bounds.width * 0.32;
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(dx, dy);
    const displayScale = radius / Math.max(radius, distance);
    knob.style.transform = `translate(${dx * displayScale}px, ${dy * displayScale}px)`;

    // A small dead zone prevents movement when the thumb rests near the center.
    const strength = Math.max(0, (Math.min(distance / radius, 1) - 0.14) / 0.86);
    stickX = (dx / (distance || 1)) * strength;
    stickZ = (-dy / (distance || 1)) * strength;
  }

  stick.addEventListener("pointerdown", (event) => {
    if (stickPointer !== null || event.button !== 0) return;
    event.preventDefault();
    stickPointer = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    moveStick(event);
  }, { signal });
  stick.addEventListener("pointermove", (event) => {
    if (event.pointerId === stickPointer) moveStick(event);
  }, { signal });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    stick.addEventListener(type, (event) => {
      if (event.pointerId === stickPointer) releaseStick();
    }, { signal });
  }
  jump.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    jumpRequested = true;
  }, { signal });
  jump.addEventListener("click", (event) => {
    if (event.detail === 0) jumpRequested = true;
  }, { signal });
  restart.addEventListener("click", (event) => {
    restartRequested = true;
    if (event.detail > 0) restart.blur();
  }, { signal });

  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    if (event.code in movementKeys) {
      keys.add(event.code);
      event.preventDefault();
    } else if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      if (!event.repeat) jumpRequested = true;
    } else if (event.code === "KeyR" && !event.repeat) {
      restartRequested = true;
    }
  }, { signal });
  window.addEventListener("keyup", (event) => keys.delete(event.code), { signal });
  window.addEventListener("blur", reset, { signal });
  document.addEventListener("visibilitychange", reset, { signal });

  return {
    movement() {
      let x = stickX;
      let z = stickZ;
      for (const code of keys) {
        const [dx, dz] = movementKeys[code];
        x += dx;
        z += dz;
      }
      const length = Math.max(1, Math.hypot(x, z));
      return { x: x / length, z: z / length };
    },
    takeJump() {
      const requested = jumpRequested;
      jumpRequested = false;
      return requested;
    },
    takeRestart() {
      const requested = restartRequested;
      restartRequested = false;
      return requested;
    },
    dispose() {
      reset();
      listeners.abort();
    },
  };
}

export type GameInput = ReturnType<typeof createInput>;
