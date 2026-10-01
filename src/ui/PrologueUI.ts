import "./prologue.css";
type Speaker = "guide" | "hero";
export class PrologueUI {
  private root = document.createElement("div");
  private start = document.createElement("div");
  private dialogue = document.createElement("section");
  private image = document.createElement("img");
  private heading = document.createElement("h2");
  private text = document.createElement("p");
  private next = document.createElement("button");
  private end = document.createElement("section");
  private startButton = document.createElement("button");
  private advance?: () => void;
  constructor(onStart: () => void) {
    this.root.className = "prologue-ui";
    this.start.className = "start-overlay";
    this.startButton.textContent = "Загрузка…";
    this.startButton.disabled = true;
    this.startButton.onclick = () => {
      this.start.hidden = true;
      document.body.classList.remove("before-start");
      onStart();
    };
    this.start.append(this.startButton);
    this.dialogue.className = "dialogue";
    this.dialogue.hidden = true;
    this.dialogue.setAttribute("role", "dialog");
    this.dialogue.setAttribute("aria-labelledby", "speaker");
    this.heading.id = "speaker";
    const content = document.createElement("div");
    content.className = "dialogue-content";
    this.next.textContent = "Далее";
    this.next.onclick = () => this.advance?.();
    content.append(this.heading, this.text, this.next);
    this.dialogue.append(this.image, content);
    this.end.className = "end-overlay";
    this.end.hidden = true;
    this.root.append(this.start, this.dialogue, this.end);
    document.body.append(this.root);
    document.body.classList.add("before-start");
  }
  ready() {
    this.startButton.disabled = false;
    this.startButton.textContent = "Начать";
  }
  show(
    speaker: Speaker,
    text: string,
    next: () => void,
    label = "Далее",
    remote = false,
  ) {
    this.advance = next;
    this.image.src = `${import.meta.env.BASE_URL}images/characters/${speaker === "guide" ? "andrey" : "specialist"}-cartoon-v2.png`;
    this.image.alt =
      speaker === "guide" ? "Андрей Криницын" : "Специалист по охране труда";
    this.heading.textContent =
      speaker === "guide"
        ? remote
          ? "Андрей · на связи"
          : "Андрей Криницын"
        : "Специалист по охране труда";
    this.text.textContent = text;
    this.next.textContent = label;
    this.dialogue.hidden = false;
    this.next.focus({ preventScroll: true });
  }
  hide() {
    this.dialogue.hidden = true;
    this.advance = undefined;
  }
  finish(saved: boolean) {
    this.hide();
    const h = document.createElement("h1");
    h.textContent = "Подготовьтесь к проверке";
    const p = document.createElement("p");
    p.textContent =
      "Продолжите урок. После него вы вернётесь в мастерскую и проведёте проверку по видеосвязи.";
    this.end.append(h, p);
    if (!saved) {
      const note = document.createElement("p");
      note.textContent = "Браузер не смог сохранить прохождение пролога.";
      this.end.append(note);
    }
    this.end.hidden = false;
  }
  error() {
    this.startButton.textContent =
      "Не удалось загрузить сцену. Обновите страницу.";
  }
  dispose() {
    this.advance = undefined;
    this.root.remove();
    document.body.classList.remove("before-start");
  }
}
