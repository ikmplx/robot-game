export function setupFullscreen(viewport: HTMLElement, button: HTMLButtonElement, status: HTMLElement) {
  const events = new AbortController();
  const options = { signal: events.signal };

  function updateButton() {
    const active = document.fullscreenElement === viewport;
    const label = active ? "Выйти из полноэкранного режима" : "На весь экран";
    button.setAttribute("aria-label", label);
    button.title = label;
    status.textContent = "";
  }

  if (document.fullscreenEnabled && !matchMedia("(display-mode: standalone)").matches) {
    button.hidden = false;
    document.addEventListener("fullscreenchange", updateButton, options);
    button.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === viewport) {
          await document.exitFullscreen();
        } else {
          await viewport.requestFullscreen();
        }
      } catch {
        status.textContent = "Браузер не смог переключить полноэкранный режим.";
      }
    }, options);
    updateButton();
  }

  return () => events.abort();
}
