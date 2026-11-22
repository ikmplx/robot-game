import { createCatPuzzle } from "./cat-puzzle";
import { createTravelJournal } from "./travel-journal";

type View = {
  health: number;
  coins: number;
  totalCoins: number;
  objective: string;
  bossHealth: number | null;
  bossMaxHealth: number;
  checkpointIndex: number;
  interaction: string;
  feedback: string;
  finished: boolean;
};

export function createHud(actions: {
  unlockDoor: () => void;
  restart: () => void;
  selectCheckpoint: (index: number) => void;
  clearInput: () => void;
}, checkpoints: readonly { label: string }[]) {
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
  const checkpointDialog = document.querySelector<HTMLDialogElement>("#checkpoint-menu")!;
  const checkpointList = document.querySelector<HTMLElement>("#checkpoint-list")!;
  const closeCheckpoints = document.querySelector<HTMLButtonElement>("#close-checkpoints")!;
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
  const travel = createTravelJournal(actions.clearInput, resumeGame, options);
  let checkpointIndex = 0;

  function modalOpen() {
    return dialog.open || puzzle.open || checkpointDialog.open || travel.open;
  }

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
    if (modalOpen()) return;
    actions.clearInput();
    dialog.showModal();
    close.focus();
  }

  const checkpointButtons = checkpoints.map(({ label }, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      if (!checkpointDialog.open) return;
      checkpointDialog.close();
      actions.selectCheckpoint(index);
    }, options);
    checkpointList.append(button);
    return button;
  });

  document.querySelector("#checkpoints")!.addEventListener("click", () => {
    if (modalOpen()) return;
    for (const [index, button] of checkpointButtons.entries()) {
      if (index === checkpointIndex) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    }
    actions.clearInput();
    checkpointDialog.showModal();
    closeCheckpoints.focus();
  }, options);
  closeCheckpoints.addEventListener("click", () => checkpointDialog.close(), options);
  checkpointDialog.addEventListener("close", resumeGame, options);

  document.querySelector("#lessons")!.addEventListener("click", showLessons, options);
  document.querySelector("#travel-journal-button")!.addEventListener("click", () => {
    if (!modalOpen()) travel.showJournal();
  }, options);
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
    get paused() { return modalOpen(); },
    get travelOpen() { return travel.open; },
    dismissTravel: travel.dismiss,
    countStars,
    showLessons,
    talkToLibrarian() {
      if (!modalOpen()) travel.talk();
    },
    showMinigame() {
      if (!modalOpen() && countStars() === 3) puzzle.show();
    },
    resetMosaic: puzzle.reset,
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
      checkpointIndex = view.checkpointIndex;
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
      if (checkpointDialog.open) checkpointDialog.close();
      lessonList.replaceChildren();
      checkpointList.replaceChildren();
      puzzle.dispose();
      travel.dismiss();
      events.abort();
    },
  };
}
