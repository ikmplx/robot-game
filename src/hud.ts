type View = {
  health: number;
  coins: number;
  totalCoins: number;
  objective: string;
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
  const interact = document.querySelector<HTMLButtonElement>("#interact")!;
  const interactionLabel = interact.querySelector("span")!;
  const feedback = document.querySelector<HTMLElement>("#feedback")!;
  const result = document.querySelector<HTMLElement>("#result")!;
  const resultCoins = document.querySelector<HTMLElement>("#result-coins")!;
  const dialog = document.querySelector<HTMLDialogElement>("#activity")!;
  const title = document.querySelector<HTMLElement>("#activity-title")!;
  const copy = document.querySelector<HTMLElement>("#activity-copy")!;
  const close = document.querySelector<HTMLButtonElement>("#close-activity")!;
  const lessonList = document.querySelector<HTMLElement>("#lesson-list")!;
  const completeMinigame = document.querySelector<HTMLButtonElement>("#complete-minigame")!;
  const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

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

  function showActivity(kind: "lessons" | "minigame") {
    if (dialog.open) return;
    const lessons = kind === "lessons";
    title.textContent = lessons ? "Уроки" : "Замок двери";
    copy.textContent = lessons
      ? "Зачтите три урока, чтобы получить три звезды. Каждый урок пока заменён кнопкой."
      : "В прототипе мини-игру заменяет кнопка. Завершите её, чтобы открыть дверь.";
    lessonList.hidden = !lessons;
    completeMinigame.hidden = lessons;
    actions.clearInput();
    dialog.showModal();
    (lessons ? close : completeMinigame).focus();
  }

  document.querySelector("#lessons")!.addEventListener("click", () => showActivity("lessons"), options);
  document.querySelector("#play-again")!.addEventListener("click", () => {
    actions.restart();
    canvas.focus();
  }, options);
  close.addEventListener("click", () => dialog.close(), options);
  dialog.addEventListener("close", () => {
    actions.clearInput();
    canvas.focus();
  }, options);
  completeMinigame.addEventListener("click", () => {
    actions.unlockDoor();
    dialog.close();
  }, options);

  function setText(element: HTMLElement, value: string) {
    if (element.textContent !== value) element.textContent = value;
  }

  return {
    get paused() { return dialog.open; },
    countStars,
    showLessons: () => showActivity("lessons"),
    showMinigame: () => showActivity("minigame"),
    reset() {
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
      events.abort();
    },
  };
}
