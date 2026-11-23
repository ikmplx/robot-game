import himejiPhoto from "./assets/himeji-castle.jpg";

const cardKey = import.meta.env.BASE_URL === "/robot-game/dev/"
  ? "rubezh.dev.travel-journal.himeji"
  : "rubezh.travel-journal.himeji";
const fact = "В Японии замок Химэдзи прозвали замком Белой цапли. Его белые стены и многоярусные крыши напоминают цаплю, которая расправила крылья перед взлётом.";

export function createTravelJournal(pauseGame: () => void, resumeGame: () => void, options: AddEventListenerOptions) {
  const conversation = document.querySelector<HTMLDialogElement>("#librarian-dialog")!;
  const journal = document.querySelector<HTMLDialogElement>("#travel-journal")!;
  const closeConversation = document.querySelector<HTMLButtonElement>("#close-librarian")!;
  const closeJournal = document.querySelector<HTMLButtonElement>("#close-travel-journal")!;
  const reward = document.querySelector<HTMLElement>("#librarian-reward")!;
  const empty = document.querySelector<HTMLElement>("#travel-journal-empty")!;
  const card = document.querySelector<HTMLElement>("#himeji-card")!;
  document.querySelector("#librarian-fact")!.textContent = `Знаешь, почему замку дали птичье имя? ${fact}`;
  document.querySelector("#himeji-fact")!.textContent = fact;
  document.querySelector<HTMLImageElement>("#himeji-photo")!.src = himejiPhoto;

  let collected = false;
  try { collected = localStorage.getItem(cardKey) === "1"; } catch { /* Storage can be disabled. */ }

  function show(dialog: HTMLDialogElement, closeButton: HTMLButtonElement) {
    pauseGame();
    dialog.showModal();
    closeButton.focus();
  }

  function showJournal() {
    card.hidden = !collected;
    empty.hidden = collected;
    show(journal, closeJournal);
  }

  function dismiss() {
    if (journal.open) journal.close();
    if (conversation.open) conversation.close();
  }

  closeConversation.addEventListener("click", dismiss, options);
  closeJournal.addEventListener("click", dismiss, options);
  document.querySelector("#view-travel-card")!.addEventListener("click", () => {
    if (!conversation.open) return;
    conversation.close();
    showJournal();
  }, options);
  for (const dialog of [conversation, journal]) {
    dialog.addEventListener("close", () => {
      if (!conversation.open && !journal.open) resumeGame();
    }, options);
    dialog.addEventListener("keydown", (event) => {
      if (event.code !== "KeyE" || event.repeat) return;
      event.preventDefault();
      dialog.close();
    }, options);
  }

  return {
    get open() { return conversation.open || journal.open; },
    dismiss,
    showJournal,
    talk() {
      reward.textContent = collected ? "Эта карточка уже в твоём дневнике." : "Карточка «Замок Белой цапли» добавлена в дневник.";
      if (!collected) {
        collected = true;
        try { localStorage.setItem(cardKey, "1"); } catch { /* Keep the card for this session. */ }
      }
      show(conversation, closeConversation);
    },
  };
}
