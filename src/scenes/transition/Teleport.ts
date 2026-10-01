import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
export class Teleport {
  private elapsed = 0;
  private actors;
  private rings;
  private particles;
  private material;
  done = false;
  constructor(
    scene: Scene,
    roots: TransformNode[],
    private arrival: boolean,
  ) {
    this.actors = roots.map((root) => ({
      root,
      meshes: root
        .getChildMeshes()
        .map((mesh) => ({ mesh, visibility: mesh.visibility })),
      origin: root.position.clone(),
    }));
    this.material = new StandardMaterial("teleport light", scene);
    this.material.disableLighting = true;
    this.material.emissiveColor = Color3.FromHexString("#a6e8de");
    this.rings = this.actors.flatMap((actor) =>
      [0, 1].map((layer) => {
        const mesh = MeshBuilder.CreateTorus(
          "teleport ring",
          { diameter: 1.45, thickness: 0.025, tessellation: 64 },
          scene,
        );
        mesh.material = this.material;
        return { mesh, actor, layer };
      }),
    );
    this.particles = this.actors.flatMap((actor) =>
      Array.from({ length: 20 }, (_, i) => {
        const mesh = MeshBuilder.CreateBox(
          "teleport mote",
          { size: 0.038 },
          scene,
        );
        mesh.material = this.material;
        return { mesh, actor, i };
      }),
    );
    this.update(0);
  }
  update(dt: number) {
    if (this.done) return;
    this.elapsed += dt;
    const t = this.elapsed;
    const dissolve = smooth((t - 0.45) / 1.4),
      fade = smooth(t / 0.25) * (1 - smooth((t - 2) / 0.65));
    for (const a of this.actors) {
      for (const m of a.meshes)
        m.mesh.visibility =
          m.visibility * (this.arrival ? dissolve : 1 - dissolve);
      if (!this.arrival && dissolve === 1) a.root.setEnabled(false);
    }
    for (const r of this.rings) {
      r.mesh.position.copyFrom(r.actor.origin);
      r.mesh.position.y +=
        0.05 +
        (r.layer
          ? (this.arrival ? 1 - smooth(t / 2) : smooth(t / 2)) * 2.1
          : 0);
      r.mesh.visibility = fade;
    }
    for (const p of this.particles) {
      p.mesh.position.set(
        p.actor.origin.x + Math.sin(p.i * 2.4 + t) * 0.42,
        p.actor.origin.y +
          (p.i % 8) * 0.22 +
          (this.arrival ? 1 - dissolve : dissolve) * 0.5,
        p.actor.origin.z + Math.cos(p.i * 2.4 + t) * 0.42,
      );
      p.mesh.visibility = fade;
    }
    if (t >= 2.8) {
      this.done = true;
      this.dispose();
    }
  }
  dispose() {
    for (const r of this.rings) r.mesh.dispose();
    for (const p of this.particles) p.mesh.dispose();
    this.material.dispose();
  }
}
