import imageUrl from "./assets/cat-mosaic.jpg";

const columns = 4;
const tileNames = [
  "Левое ухо", "Левый глаз и лоб", "Правый глаз и лоб", "Правое ухо",
  "Левые усы", "Левая половина мордочки", "Правая половина мордочки", "Правые усы",
];
const rows = tileNames.length / columns;

type Actions = {
  pauseGame: () => void;
  resumeGame: () => void;
  solve: () => void;
};

export function createCatPuzzle(actions: Actions, options: AddEventListenerOptions) {
  const dialog = document.querySelector<HTMLDialogElement>("#cat-lock")!;
  const board = document.querySelector<HTMLElement>("#puzzle-board")!;
  const preview = document.querySelector<HTMLImageElement>("#puzzle-preview")!;
  const instructions = document.querySelector<HTMLElement>("#puzzle-instructions")!;
  const status = document.querySelector<HTMLElement>("#puzzle-status")!;
  const progress = document.querySelector<HTMLProgressElement>("#puzzle-progress")!;
  const shuffleButton = document.querySelector<HTMLButtonElement>("#shuffle-puzzle")!;
  const continueButton = document.querySelector<HTMLButtonElement>("#leave-puzzle")!;

  let order = tileNames.map((_, index) => index);
  let selected: number | null = null;
  let solved = false;

  board.style.setProperty("--mosaic-image", `url("${imageUrl}")`);
  preview.src = imageUrl;

  const buttons = tileNames.map((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "puzzle-tile";
    button.addEventListener("click", () => choose(index), options);
    button.addEventListener("keydown", (event) => navigate(event, index), options);
    board.append(button);
    return button;
  });

  function navigate(event: KeyboardEvent, index: number) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const neighbors: Partial<Record<string, number>> = {
      ArrowLeft: column > 0 ? index - 1 : index,
      ArrowRight: column < columns - 1 ? index + 1 : index,
      ArrowUp: row > 0 ? index - columns : index,
      ArrowDown: row < rows - 1 ? index + columns : index,
    };
    const target = neighbors[event.key];
    if (target === undefined) return;
    event.preventDefault();
    buttons[target].focus();
  }

  function correctCount() {
    return order.filter((tile, index) => tile === index).length;
  }

  function render() {
    for (const [index, button] of buttons.entries()) {
      const tile = order[index];
      const x = (tile % columns) / (columns - 1) * 100;
      const y = Math.floor(tile / columns) / (rows - 1) * 100;
      const row = Math.floor(index / columns) + 1;
      const column = index % columns + 1;
      button.style.backgroundPosition = `${x}% ${y}%`;
      button.setAttribute("aria-label", `Ряд ${row}, столбец ${column}. ${tileNames[tile]}`);
      button.setAttribute("aria-pressed", String(index === selected));
      button.disabled = solved;
    }
    dialog.classList.toggle("puzzle-solved", solved);
    instructions.hidden = solved;
    dialog.setAttribute("aria-describedby", solved ? status.id : instructions.id);
    const correct = correctCount();
    progress.value = correct;
    const message = solved ? "Мозаика собрана. Замок открыт!" : `${correct} из ${tileNames.length} на месте`;
    if (status.textContent !== message) status.textContent = message;
    shuffleButton.hidden = solved;
    continueButton.hidden = !solved;
  }

  function shuffle() {
    do {
      for (let index = order.length - 1; index > 0; index--) {
        const next = Math.floor(Math.random() * (index + 1));
        [order[index], order[next]] = [order[next], order[index]];
      }
    } while (correctCount() > 3);
    selected = null;
    render();
  }

  function choose(index: number) {
    if (!dialog.open || solved) return;
    if (selected === null || selected === index) {
      selected = selected === index ? null : index;
      render();
      return;
    }

    [order[selected], order[index]] = [order[index], order[selected]];
    selected = null;
    solved = correctCount() === order.length;
    render();
    if (solved) {
      actions.solve();
      continueButton.focus();
    }
  }

  shuffleButton.addEventListener("click", () => {
    if (dialog.open && !solved) shuffle();
  }, options);
  document.querySelector("#close-puzzle")!.addEventListener("click", () => dialog.close(), options);
  continueButton.addEventListener("click", () => dialog.close(), options);
  dialog.addEventListener("close", () => {
    selected = null;
    render();
    actions.resumeGame();
  }, options);

  return {
    get open() { return dialog.open; },
    show() {
      if (dialog.open || solved) return;
      actions.pauseGame();
      dialog.showModal();
      buttons[0].focus();
    },
    reset() {
      order = tileNames.map((_, index) => index);
      solved = false;
      shuffle();
    },
    dispose() {
      if (dialog.open) dialog.close();
      board.replaceChildren();
    },
  };
}
