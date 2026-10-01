import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { ModelLoader } from "../assets/ModelLoader";
import { createWorkshop } from "../scenes/workshop/createWorkshop";
import { loadWorkshopProps } from "../scenes/workshop/loadWorkshopProps";
import { tabletPickup, documentTable } from "../scenes/workshop/workshopLayout";
import { createTablet } from "../scenes/workshop/createTablet";
import { groundedCharacterY } from "../scenes/characters/groundCharacter";
import { TabletPose } from "../scenes/characters/TabletPose";
import { Teleport } from "../scenes/transition/Teleport";
import { PrologueUI } from "../ui/PrologueUI";

type Actor = {
  root: TransformNode;
  model: AssetContainer;
  idle?: AnimationGroup;
  walk?: AnimationGroup;
};
type Phase =
  | "ready"
  | "arrival"
  | "dialogue"
  | "departure"
  | "walk"
  | "pickup"
  | "remote"
  | "finished";
const ease = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const dialogue: ["guide" | "hero", string][] = [
  [
    "guide",
    "Предыдущее предписание закрыто. А здесь другой объект «Маяка» — мастерская. Нас ждёт новая проверка.",
  ],
  ["hero", "Значит, сейчас пойдём смотреть мастерскую?"],
  [
    "guide",
    "Ты пойдёшь. А я увижу её через твою камеру. Проверка пройдёт по видеосвязи в приложении «Инспектор».",
  ],
  ["hero", "И этого достаточно, чтобы разобраться, что здесь происходит?"],
  [
    "guide",
    "Если правильно организовать связь и показать то, что нужно. Скоро попробуешь сам.",
  ],
  ["guide", "На столе планшет. Возьми его, а я подключусь с другой стороны."],
];
export class PrologueGame {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private loader: ModelLoader;
  private shadows: ShadowGenerator;
  private walkDuration = 2.75;
  private ui: PrologueUI;
  private hero?: Actor;
  private guide?: Actor;
  private pose?: TabletPose;
  private teleport?: Teleport;
  private tablet;
  private phase: Phase = "ready";
  private phaseTime = 0;
  private total = 0;
  private line = 0;
  private disposed = false;
  private walkStart = new Vector3(-1.25, 0.03, 2);
  private walkEnd = new Vector3(tabletPickup.x, 0.03, tabletPickup.z);
  private tabletStart: Vector3;
  private cameraGoal = new Vector3(0, 1, -3.4);
  private radiusGoal = 22;
  readonly ready: Promise<void>;
  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.engine.setHardwareScalingLevel(
      Math.max(1, window.devicePixelRatio / 1.7),
    );
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color4.FromHexString("#283e47ff");
    this.scene.ambientColor = Color3.FromHexString("#617275");
    this.camera = new ArcRotateCamera(
      "prologue camera",
      1.13,
      0.91,
      22,
      this.cameraGoal.clone(),
      this.scene,
    );
    this.fitCamera();
    this.camera.minZ = 0.08;
    this.camera.inputs.clear();
    const sky = new HemisphericLight(
      "soft daylight",
      new Vector3(0, 1, 0),
      this.scene,
    );
    sky.intensity = 0.72;
    sky.groundColor = Color3.FromHexString("#8b9a9a");
    const sun = new DirectionalLight(
      "window sunlight",
      new Vector3(-0.7, -1, 0.5),
      this.scene,
    );
    sun.position.set(10.5, 16, -11.2);
    sun.intensity = 0.85;
    sun.diffuse = Color3.FromHexString("#fff1d7");
    sun.shadowFrustumSize = 24;
    sun.shadowMinZ = .1;
    sun.shadowMaxZ = 40;
    const shadows = this.shadows = new ShadowGenerator(2048, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadows.transparencyShadow = true;
    shadows.bias = 0.0003;
    shadows.normalBias = 0.015;
    const workshop = createWorkshop(this.scene, shadows);
    this.tabletStart = workshop.tabletPosition;
    this.tablet = createTablet(this.scene, this.tabletStart, shadows);
    this.tablet.root.scaling.setAll(0.48);
    this.tablet.root.rotation.y = Math.atan2(this.tabletStart.x - this.walkEnd.x, this.tabletStart.z - this.walkEnd.z);
    this.loader = new ModelLoader(this.scene, shadows);
    this.ui = new PrologueUI(() => this.start());
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.visibility);
    this.engine.runRenderLoop(this.render);
    this.ready = this.load();
  }
  private async load() {
    try {
      const models = await Promise.all([
        this.loader.load(
          "quaternius/worker.gltf",
          { x: -1.25, y: 0.03, z: 2, height: 1.72, rotation: Math.PI / 2 },
          "hero",
        ),
        this.loader.load(
          "office/andrey.glb",
          { x: 0.55, y: 0.03, z: 1.85, height: 1.78, rotation: -Math.PI / 2 },
          "guide",
        ),
      ]);
      if (this.disposed) return;
      models.forEach((model, i) => {
        if (!model) return;
        const root = this.scene.getTransformNodeByName(
          `${i ? "guide" : "hero"}-pivot`,
        )!;
        const idle =
          model.animationGroups.find((a) => a.name === "Idle_Neutral") ??
          model.animationGroups.find((a) => a.name === "Idle");
        idle?.start(true, 0.65);
        idle?.goToFrame(idle.from);
        root.position.y = groundedCharacterY(model, root, 0.025);
        const actor = {
          root,
          model,
          idle,
          walk: model.animationGroups.find((a) => a.name === "Walk"),
        };
        if (i) this.guide = actor;
        else {
          this.hero = actor;
          this.walkStart.copyFrom(root.position);
          this.walkEnd.y = root.position.y;
          this.pose = new TabletPose(this.scene, model, root, this.tablet.root);
        }
      });
      if (!this.hero || !this.guide) throw new Error("Character load failed");
      for (const a of [this.hero, this.guide]) a.root.setEnabled(false);
      await loadWorkshopProps(this.scene, this.loader, this.shadows);
      if (this.disposed) return;
      await this.scene.whenReadyAsync();
      if (!this.disposed) {
        this.ui.ready();
        if (import.meta.env.DEV && new URLSearchParams(location.search).has("previewRoom")) {
          document.querySelector(".start-overlay")?.remove();
          document.body.classList.remove("before-start");
          const focus = new URLSearchParams(location.search).get("roomFocus");
          this.cameraGoal.set(focus === "table" ? documentTable.x : 0, 1, focus === "storage" ? -9.2 : focus === "table" ? .5 : -3.7);
          this.camera.target.copyFrom(this.cameraGoal);
          this.camera.radius = this.radiusGoal = focus === "table" ? 6 : focus === "storage" ? 11 : 22;
          this.camera.beta = 0.8;
          this.camera.alpha = Number(new URLSearchParams(location.search).get("view") ?? 1.13);
        }
        if (import.meta.env.DEV && new URLSearchParams(location.search).has("previewTablet")) {
          this.guide.root.setEnabled(false);
          this.hero.root.setEnabled(true);
          this.hero.root.position.copyFrom(this.walkEnd);
          this.hero.root.rotation.y = Math.atan2(this.tabletStart.x - this.walkEnd.x, this.tabletStart.z - this.walkEnd.z);
          for (const mesh of this.hero.root.getChildMeshes()) mesh.visibility = 1;
          this.setPhase(new URLSearchParams(location.search).has("previewPickup") ? "pickup" : "remote");
          this.ui.hide();
          document.querySelector(".start-overlay")?.remove();
          document.body.classList.remove("before-start");
          this.cameraGoal.copyFrom(this.hero.root.position.add(new Vector3(0, 1.15, 0)));
          this.camera.target.copyFrom(this.cameraGoal);
          this.radiusGoal = this.camera.radius = 3;
          this.camera.beta = 1.2;
          this.camera.alpha = Number(new URLSearchParams(location.search).get("view") ?? 1.13);
        }
      }
    } catch (error) {
      if (!this.disposed) {
        console.error(error);
        this.ui.error();
      }
    }
  }
  private start() {
    if (this.phase !== "ready" || !this.hero || !this.guide) return;
    for (const a of [this.hero, this.guide]) {
      a.root.setEnabled(true);
      for (const mesh of a.root.getChildMeshes()) mesh.visibility = 1;
    }
    this.teleport = new Teleport(
      this.scene,
      [this.hero.root, this.guide.root],
      true,
    );
    this.setPhase("arrival");
    this.cameraGoal.set(0, 1, -3.4);
    this.radiusGoal = 22;
  }
  private setPhase(phase: Phase) {
    this.phase = phase;
    this.phaseTime = 0;
  }
  private showLine() {
    this.setPhase("dialogue");
    const [speaker, text] = dialogue[this.line];
    this.ui.show(speaker, text, () => {
      this.line++;
      if (this.line < dialogue.length) this.showLine();
      else this.depart();
    });
  }
  private depart() {
    this.ui.hide();
    this.setPhase("departure");
    this.teleport = new Teleport(this.scene, [this.guide!.root], false);
    this.hero!.root.rotation.y = Math.atan2(
      this.guide!.root.position.x - this.hero!.root.position.x,
      this.guide!.root.position.z - this.hero!.root.position.z,
    );
  }
  private beginWalk() {
    this.setPhase("walk");
    this.tablet.showGuide();
    const actor = this.hero!;
    actor.walk?.start(true, 0.7);
    actor.idle?.setWeightForAllAnimatables(0);
    actor.walk?.setWeightForAllAnimatables(1);
    actor.root.rotation.y = Math.atan2(this.walkEnd.x - this.walkStart.x, this.walkEnd.z - this.walkStart.z);
    this.walkDuration = Vector3.Distance(this.walkStart, this.walkEnd);
    this.cameraGoal.set(documentTable.x, 1.0, .7);
    this.radiusGoal = 9;
  }
  private remote() {
    this.setPhase("remote");
    this.tablet.showGuide();
    this.ui.show(
      "guide",
      "Теперь я на другой стороне связи. В мастерской тебе предстоит показать объект, ответить на вопросы и передать материалы в чате.",
      () => {
        this.tablet.showInvitation();
        this.ui.show(
          "hero",
          "Приглашение пришло. Осталось разобраться, как подготовиться и подключиться.",
          () => this.finish(),
          "Продолжить урок",
        );
      },
      "Далее",
      true,
    );
  }
  private finish() {
    this.setPhase("finished");
    let saved = true;
    try {
      localStorage.setItem(
        "git-inspection-2027:lesson-3-prologue",
        JSON.stringify({ version: 1, completedAt: new Date().toISOString() }),
      );
    } catch {
      saved = false;
    }
    this.ui.finish(saved);
  }
  private render = () => {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    if (!document.hidden) {
      this.phaseTime += dt;
      if (import.meta.env.DEV && this.phase === "pickup" && new URLSearchParams(location.search).has("previewPickup")) {
        this.phaseTime = Math.max(0, Math.min(2.1, Number(new URLSearchParams(location.search).get("previewPickup")) || 0));
      }
      this.total += dt;
      this.camera.target = Vector3.Lerp(
        this.camera.target,
        this.cameraGoal,
        1 - Math.exp(-dt * 2),
      );
      this.camera.radius +=
        (this.radiusGoal - this.camera.radius) * (1 - Math.exp(-dt * 2));
      this.tablet.update(this.total);
      this.teleport?.update(dt);
      if (this.phase === "arrival" && this.phaseTime > 1.2) {
        this.cameraGoal.set(0.2, 1.05, 0.1);
        this.radiusGoal = 13;
      }
      if (this.phase === "arrival" && this.teleport?.done) this.showLine();
      if (this.phase === "departure" && this.teleport?.done) this.beginWalk();
      if (this.phase === "walk") {
        const t = Math.min(1, this.phaseTime / this.walkDuration);
        this.hero!.root.position.copyFrom(
          Vector3.Lerp(this.walkStart, this.walkEnd, t),
        );
        if (t === 1) {
          this.hero!.walk?.stop();
          this.hero!.idle?.setWeightForAllAnimatables(1);
          this.hero!.root.rotation.y = Math.atan2(
            this.tabletStart.x - this.walkEnd.x,
            this.tabletStart.z - this.walkEnd.z,
          );
          this.setPhase("pickup");
        }
      }
      if (
        this.phase === "pickup" ||
        this.phase === "remote" ||
        this.phase === "finished"
      ) {
        const t = this.phase === "pickup" ? ease((this.phaseTime - 0.65) / 1.4) : 1;
        const hero = this.hero!.root;
        const forward = new Vector3(
          Math.sin(hero.rotation.y),
          0,
          Math.cos(hero.rotation.y),
        );
        const hold = hero.position.add(forward.scale(0.22));
        hold.y = hero.position.y + 1.28;
        this.tablet.root.position.copyFrom(
          Vector3.Lerp(this.tabletStart, hold, t),
        );
        this.tablet.root.rotation.set(
          (Math.PI / 2) * (1 - t) + 0.55 * t,
          hero.rotation.y,
          0,
        );
        this.pose?.update(this.phase === "pickup" ? ease(this.phaseTime / 0.65) : 1, this.phase === "pickup" ? 0.65 * (1 - t) * ease(this.phaseTime / 0.65) : 0);
        if (this.phase === "pickup" && this.phaseTime > 2.2) this.remote();
      }
    }
    this.scene.render();
  };
  private fitCamera() {
    // Same framing rule as lesson 2: keep the central scene visible in narrow embeds.
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    this.camera.fov = 2 * Math.atan(Math.tan(0.4) * Math.max(1, 0.8 / aspect));
  }
  private resize = () => {
    this.engine.resize();
    this.fitCamera();
  };
  private visibility = () => {
    if (!document.hidden) this.engine.getDeltaTime();
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.engine.stopRenderLoop(this.render);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.visibility);
    this.pose?.dispose();
    this.teleport?.dispose();
    this.ui.dispose();
    this.tablet.dispose();
    this.loader.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
