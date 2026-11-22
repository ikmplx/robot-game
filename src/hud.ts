import { createCatPuzzle } from "./cat-puzzle";

type View = {
  health: number;
  coins: number;
  totalCoins: number;
  objective: string;
  bossHealth: number | null;
  bossMaxHealth: number;
  interaction: string;
  feedback: string;
  finished: boolean;
};

export function createHud(actions: { unlockDoor: () => void; restart: () => void; clearInput: () => void }) {
  const events = new AbortController();
  const options = { signal: events.signal };
  const health = document.querySelector<HTMLElement>("#health")!;
  const coins = document.querySelector<HTMLElement>("#coins")!;
  const stars = document.querySelector<HTMLElement>("#stars")!;
  const objective = document.querySelector<HTMLElement>("#objective")!;
  const bossHealth = document.querySelector<HTMLElement>("#boss-health")!;
  const bossMeter = document.querySelector<HTMLProgressElement>("#boss-meter")!;
  const interact = document.querySelector<HTMLButtonElement>("#interact")!;
  const interactionLabel = interact.querySelector("span")!;
  const feedback = document.querySelector<HTMLElement>("#feedback")!;
  const result = document.querySelector<HTMLElement>("#result")!;
  const resultCoins = document.querySelector<HTMLElement>("#result-coins")!;
  const dialog = document.querySelector<HTMLDialogElement>("#activity")!;
  const close = document.querySelector<HTMLButtonElement>("#close-activity")!;
  const lessonList = document.querySelector<HTMLElement>("#lesson-list")!;
  const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

  function resumeGame() {
    actions.clearInput();
    canvas.focus();
  }

  const puzzle = createCatPuzzle({
    pauseGame: actions.clearInput,
    resumeGame,
    solve: actions.unlockDoor,
  }, options);

  function countStars() {
    return lessonButtons.filter((button) => button.disabled).length;
  }

  function renderStars() {
    const count = countStars();
    stars.textContent = `${count} / 3`;
    stars.setAttribute("aria-label", `Звёзды: ${count} из 3`);
  }

  const lessonButtons = Array.from({ length: 3 }, (_, index) => {
    const row = document.createElement("div");
    row.className = "lesson";
    const name = document.createElement("span");
    name.textContent = `Урок ${index + 1}`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Зачесть";
    button.setAttribute("aria-label", `Зачесть урок ${index + 1}`);
    button.addEventListener("click", () => {
      button.disabled = true;
      button.textContent = "★ Готово";
      button.setAttribute("aria-label", `Урок ${index + 1} пройден`);
      renderStars();
      (lessonButtons.find((item) => !item.disabled) ?? close).focus();
    }, options);
    row.append(name, button);
    lessonList.append(row);
    return button;
  });

  function showLessons() {
    if (dialog.open || puzzle.open) return;
    actions.clearInput();
    dialog.showModal();
    close.focus();
  }

  document.querySelector("#lessons")!.addEventListener("click", showLessons, options);
  document.querySelector("#play-again")!.addEventListener("click", () => {
    actions.restart();
    canvas.focus();
  }, options);
  close.addEventListener("click", () => dialog.close(), options);
  dialog.addEventListener("close", resumeGame, options);

  function setText(element: HTMLElement, value: string) {
    if (element.textContent !== value) element.textContent = value;
  }

  return {
    get paused() { return dialog.open || puzzle.open; },
    countStars,
    showLessons,
    showMinigame() {
      if (!dialog.open && countStars() === 3) puzzle.show();
    },
    reset() {
      puzzle.reset();
      for (const [index, button] of lessonButtons.entries()) {
        button.disabled = false;
        button.textContent = "Зачесть";
        button.setAttribute("aria-label", `Зачесть урок ${index + 1}`);
      }
      renderStars();
    },
    update(view: View) {
      const hearts = "♥".repeat(view.health) + "♡".repeat(3 - view.health);
      if (health.textContent !== hearts) {
        health.textContent = hearts;
        health.setAttribute("aria-label", `Здоровье ${view.health} из 3`);
      }
      if (coins.textContent !== String(view.coins)) {
        coins.textContent = String(view.coins);
        coins.setAttribute("aria-label", `Монеты: ${view.coins}`);
      }
      setText(objective, view.objective);
      bossHealth.hidden = view.bossHealth === null;
      if (view.bossHealth !== null && bossMeter.value !== view.bossHealth) {
        bossMeter.max = view.bossMaxHealth;
        bossMeter.value = view.bossHealth;
      }
      setText(interactionLabel, view.interaction);
      setText(feedback, view.feedback);
      interact.hidden = !view.interaction;
      feedback.hidden = !view.feedback;
      result.hidden = !view.finished;
      if (view.finished) setText(resultCoins, `Монеты ${view.coins} / ${view.totalCoins}`);
    },
    dispose() {
      if (dialog.open) dialog.close();
      lessonList.replaceChildren();
      puzzle.dispose();
      events.abort();
    },
  };
}
