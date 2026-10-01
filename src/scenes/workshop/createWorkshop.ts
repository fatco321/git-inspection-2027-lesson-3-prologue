import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export function createWorkshop(scene: Scene, shadows: ShadowGenerator) {
  const material = (name: string, hex: string) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor.setAll(0.08);
    return m;
  };
  const plaster = material("warm plaster", "#dbd9c9"),
    trim = material("pale trim", "#eee9d9");
  const teal = material("painted steel", "#397c7a"),
    dark = material("dark steel", "#304b56");
  const wood = material("birch wood", "#b88c61");
  const ochre = material("safety yellow", "#d3ac5b"),
    mint = material("mint equipment", "#8eb6a4");
  const clay = material("terracotta", "#b87b5e");
  const texture = new DynamicTexture("fine wood grain", 256, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = "#b88c61";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = i % 3 === 0 ? "#c59b70" : "#ac8058";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(i * 3.7, 0);
    ctx.bezierCurveTo(i * 3.7 + 8, 80, i * 3.7 - 5, 160, i * 3.7, 256);
    ctx.stroke();
  }
  texture.update();
  wood.diffuseTexture = texture;
  wood.diffuseColor = Color3.White();
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: StandardMaterial,
  ) => {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    if (m.alpha === 1) shadows.addShadowCaster(mesh);
    return mesh;
  };
  const cyl = (
    name: string,
    x: number,
    y: number,
    z: number,
    diameter: number,
    height: number,
    m: StandardMaterial,
  ) => {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { diameter, height, tessellation: 16 },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    if (m.alpha === 1) shadows.addShadowCaster(mesh);
    return mesh;
  };
  box("foundation", 0, -0.18, -2.7, 10.5, 0.35, 14.2, dark);
  for (let x = 0; x < 10; x++)
    for (let z = 0; z < 14; z++)
      box(
        "floor tile",
        -4.5 + x,
        0.006,
        -9.2 + z,
        0.985,
        0.025,
        0.985,
        z < 9 ? mint : plaster,
      );
  box("back wall", 0, 1.7, -9.75, 10.5, 3.4, 0.16, plaster);
  box("left wall", -5.15, 1.7, -2.7, 0.16, 3.4, 14.1, plaster);
  box("wall base", 0, 0.14, -9.63, 10.2, 0.25, 0.07, trim);
  box("left base", -5.04, 0.14, -2.7, 0.07, 0.25, 14, trim);
  box("back color band", 0, 0.7, -9.64, 10.2, 1, 0.04, teal);
  for (const x of [-3.6, 0, 3.6]) {
    box("window frame", x, 2.35, -9.63, 2.55, 1.4, 0.09, trim);
    box(
      "blue window",
      x,
      2.35,
      -9.56,
      2.38,
      1.23,
      0.025,
      material("sky " + x, "#91b7bf"),
    );
    box("window mullion", x, 2.35, -9.52, 0.05, 1.25, 0.06, trim);
  }
  // Lower partition and clear panes leave the workshop readable from the preparation room.
  box("partition base", -1.35, 0.43, -0.65, 7.5, 0.86, 0.12, teal);
  const glass = material("glass", "#b1dbd2");
  glass.alpha = 0.13;
  glass.backFaceCulling = false;
  glass.disableLighting = true;
  glass.emissiveColor = Color3.FromHexString("#a0ccc5");
  const partitionLeft = -5.1, bayWidth = 1.875;
  for (let i = 0; i < 4; i++) {
    const x = partitionLeft + bayWidth * (i + 0.5);
    box("glass pane", x, 1.8, -0.65, bayWidth - 0.055, 1.8, 0.035, glass);
    box("partition upright", partitionLeft + bayWidth * i, 1.78, -0.65, 0.055, 1.85, 0.09, dark);
  }
  box("partition lintel", -1.35, 2.73, -0.65, 7.5, 0.075, 0.12, dark);
  box("partition sill", -1.35, 0.9, -0.65, 7.5, 0.07, 0.15, trim);
  box("door right jamb", 4.5, 1.4, -0.65, 0.12, 2.8, 0.15, teal);
  box("door left jamb", 2.4, 1.4, -0.65, 0.12, 2.8, 0.15, teal);
  box("door header", 3.45, 2.77, -0.65, 2.2, 0.12, 0.15, teal);
  box("entrance side return", 4.85, 1.4, -0.65, 0.6, 2.8, 0.15, plaster);
  // Workshop: workbench, machine, protective equipment and storage.
  box("bench top", -3.25, 0.96, -5.8, 2.9, 0.12, 1.1, wood);
  for (const x of [-4.5, -2])
    for (const z of [-6.2, -5.4])
      box("bench leg", x, 0.47, z, 0.1, 0.94, 0.1, dark);
  box("tool board", -3.25, 1.82, -6.47, 2.8, 1.15, 0.07, wood);
  for (let i = 0; i < 7; i++) {
    box(
      "tool handle",
      -4.25 + i * 0.34,
      1.75,
      -6.37,
      0.065,
      0.36,
      0.045,
      i % 2 ? teal : ochre,
    );
    box("tool peg", -4.25 + i * 0.34, 1.84, -6.4, 0.025, 0.025, 0.13, dark);
    box("tool head", -4.25 + i * 0.34, 1.96, -6.36, 0.19, 0.085, 0.07, dark);
  }
  box("machine base", -0.55, 0.43, -3.95, 1.1, 0.86, 0.9, teal);
  box("machine bed", -0.55, 0.93, -3.95, 1.3, 0.14, 1.05, dark);
  cyl("machine column", -0.55, 1.55, -4.22, 0.15, 1.2, dark);
  box("drill head", -0.55, 2.08, -4.05, 0.65, 0.35, 0.75, teal);
  cyl("drill chuck", -0.55, 1.855, -3.73, 0.13, 0.13, dark);
  cyl("drill bit", -0.55, 1.615, -3.73, 0.035, 0.35, dark);
  box("machine button", -0.2, 1.97, -3.8, 0.06, 0.09, 0.1, ochre);
  box("equipment cabinet back", 0.95, 1.05, -6.4, 1.55, 2.1, 0.12, teal);
  for (const x of [0.14, 1.76])
    box("cabinet side", x, 1.05, -6.12, 0.1, 2.1, 0.65, teal);
  for (const y of [0.1, 0.75, 1.4, 2.08])
    box("cabinet shelf", 0.95, y, -6.12, 1.65, 0.06, 0.7, trim);
  for (let i = 0; i < 6; i++)
    box(
      "protective kit",
      0.58 + (i % 2) * 0.72,
      0.33 + Math.floor(i / 2) * 0.65,
      -6.07,
      0.47,
      0.4,
      0.42,
      i % 2 ? ochre : mint,
    );
  for (let level = 0; level < 2; level++)
    for (let col = 0; col < 2; col++) {
      const x = 3.1 + col * 0.7,
        y = 0.5085 + level * 0.62;
      box("storage crate", x, y, -8.5, 0.65, 0.62, 0.8, wood);
      box("crate band", x, y, -8.09, 0.12, 0.62, 0.025, ochre);
    }
  box("pallet", 3.45, 0.1085, -8.5, 1.5, 0.18, 1.05, dark);
  // Open storage entrance: a second room visible beyond the work area.
  box("storage partition", -1.6, 1.35, -6.6, 7.1, 2.7, 0.16, plaster);
  box("storage base band", -1.6, 0.55, -6.49, 7.1, 1.05, 0.05, teal);
  for (const x of [2.05, 4.65])
    box("storage doorway jamb", x, 1.4, -6.6, 0.13, 2.8, 0.24, teal);
  box("storage doorway header", 3.35, 2.78, -6.6, 2.73, 0.14, 0.24, teal);
  box("storage entrance return", 4.94, 1.35, -6.6, 0.45, 2.7, 0.16, plaster);
  // Low open shelving retains sight lines into the stockroom.
  for (const x of [-3.8, -1.1, 1.6]) {
    for (const dx of [-0.95, 0.95])
      box("storage rack upright", x + dx, 1.05, -8.7, 0.09, 2.1, 0.65, dark);
    for (const y of [0.15, 0.85, 1.55]) {
      box("storage rack shelf", x, y, -8.7, 2, 0.08, 0.75, wood);
      for (const dx of [-0.5, 0.5]) {
        box("stock carton", x + dx, y + 0.27, -8.7, 0.65, 0.46, 0.56, mint);
        box("carton tape", x + dx, y + 0.505, -8.7, 0.12, 0.012, 0.56, trim);
      }
    }
  }
  // A clear aisle connects preparation, workstations and the stockroom.
  for (const x of [2.8, 4.35])
    box("aisle edge", x, 0.026, -4.05, 0.045, 0.012, 5.0, ochre);
  // Preparation area. Furniture is offset from both arrival positions and the route to the tablet.
  box("preparation table top", 2.8, 0.97, 1.11, 2.5, 0.12, 1.42, wood);
  for (const x of [1.7, 3.9])
    for (const z of [0.53, 1.69])
      box("table leg", x, 0.465, z, 0.085, 0.93, 0.085, dark);
  box("table drawer", 3.6, 0.76, 1.11, 0.55, 0.32, 1.15, teal);
  box("drawer pull", 3.6, 0.78, 1.70, 0.26, 0.035, 0.03, trim);
  box("paper stack", 3.35, 1.0475, 1.16, 0.46, 0.035, 0.32, trim);
  cyl("cup", 3.68, 1.155, 0.7, 0.16, 0.25, clay);
  cyl("cup interior", 3.68, 1.281, 0.7, 0.125, 0.003, dark);
  box("wall bench", -4.65, 0.46, 2.15, 0.65, 0.12, 2.2, wood);
  for (const z of [1.3, 3])
    box("bench supports", -4.65, 0.2, z, 0.55, 0.4, 0.12, dark);
  cyl("plant pot", -4.2, 0.28, 3.6, 0.5, 0.5, clay);
  for (let i = 0; i < 7; i++) {
    const leaf = MeshBuilder.CreateSphere(
      "plant leaf",
      { diameter: 0.45, segments: 8 },
      scene,
    );
    leaf.scaling.set(0.5, 1.4, 0.65);
    leaf.position.set(
      -4.2 + Math.sin(i * 2.4) * 0.2,
      0.8 + (i % 3) * 0.12,
      3.6 + Math.cos(i * 2.4) * 0.2,
    );
    leaf.rotation.z = Math.sin(i) * 0.45;
    leaf.material = mint;
    shadows.addShadowCaster(leaf);
  }
  return { tabletPosition: new Vector3(1.85, 1.043, 1.5) };
}
