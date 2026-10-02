import "./style.css";
import { PrologueGame } from "./game/PrologueGame";
const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const game = new PrologueGame(canvas);
if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
