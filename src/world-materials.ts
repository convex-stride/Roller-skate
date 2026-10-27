import * as THREE from "three";
import { hash } from "./world";

export type SurfaceKind = "plaster" | "brick" | "paving" | "asphalt" | "roof" | "timber" | "stone";
const maps = new Map<SurfaceKind, { color: THREE.CanvasTexture; height: THREE.CanvasTexture }>();
const materials = new Map<string, THREE.MeshStandardMaterial>();

function texturePair(kind: SurfaceKind) {
  if (maps.has(kind)) return maps.get(kind)!;
  const canvas = document.createElement("canvas"), relief = document.createElement("canvas");
  canvas.width = canvas.height = relief.width = relief.height = 512;
  const c = canvas.getContext("2d")!, h = relief.getContext("2d")!;
  c.fillStyle = kind === "asphalt" ? "#c0c2c1" : "#eeeae2"; c.fillRect(0, 0, 512, 512);
  h.fillStyle = "#b5b5b5"; h.fillRect(0, 0, 512, 512);
  const masonry = ["brick", "paving", "stone", "roof"].includes(kind);
  if (masonry) {
    const bh = kind === "brick" ? 32 : kind === "roof" ? 64 : 128;
    const bw = kind === "brick" ? 64 : kind === "roof" ? 64 : 128;
    c.fillStyle = "#8b8981"; c.fillRect(0, 0, 512, 512);
    h.fillStyle = "#404040"; h.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 512 / bh; row++) for (let col = -1; col <= 512 / bw; col++) {
      const x = col * bw + (row % 2) * bw / 2, y = row * bh, r = hash(row, col, 24);
      const v = Math.round(205 + r * 42);
      c.fillStyle = `rgb(${v},${v - 3},${v - 9})`; c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      h.fillStyle = `rgb(${170 + r * 40},${170 + r * 40},${170 + r * 40})`; h.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      c.strokeStyle = "rgba(255,252,238,.32)"; c.lineWidth = 1;
      c.strokeRect(x + 3, y + 3, bw - 6, bh - 6);
      if (kind === "roof") {
        const gradient = c.createLinearGradient(x, y, x + bw, y);
        gradient.addColorStop(0, "rgba(20,12,8,.35)"); gradient.addColorStop(.45, "rgba(255,244,224,.15)"); gradient.addColorStop(1, "rgba(20,12,8,.2)");
        c.fillStyle = gradient; c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      }
    }
  }
  // Fine aggregate and pores, plus larger mottling: details survive at two scales.
  for (let i = 0; i < 24000; i++) {
    const x = hash(i, 11) * 512, y = hash(i, 12) * 512, v = hash(i, 13);
    c.fillStyle = v > .52 ? "rgba(255,255,250,.13)" : "rgba(26,25,20,.10)";
    c.fillRect(x, y, 1 + v * 2, 1 + v);
    h.fillStyle = v > .5 ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.16)"; h.fillRect(x, y, 1.5, 1.5);
  }
  for (let i = 0; i < 95; i++) {
    const x = hash(i, 31) * 512, y = hash(i, 32) * 512, r = 12 + hash(i, 33) * 50;
    const gradient = c.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(69,63,46,${kind === "plaster" ? .045 : .08})`); gradient.addColorStop(1, "rgba(69,63,46,0)");
    c.fillStyle = gradient;
    // Wrap the stains so the texture does not acquire a visible tile edge.
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { c.save(); c.translate(dx, dy); c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore(); }
  }
  if (kind === "timber") for (let i = 0; i < 128; i++) {
    const x = i * 4;
    c.strokeStyle = `rgba(47,31,17,${.04 + hash(i, 7) * .18})`; c.lineWidth = 1 + hash(i, 8) * 2;
    c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 5, 150, x - 6, 340, x, 512); c.stroke();
    if (i % 8 === 0) { c.fillStyle = "rgba(35,26,19,.38)"; c.fillRect(x, 0, 2, 512); h.fillStyle = "#555"; h.fillRect(x, 0, 2, 512); }
  }
  const color = new THREE.CanvasTexture(canvas), height = new THREE.CanvasTexture(relief);
  color.colorSpace = THREE.SRGBColorSpace;
  for (const t of [color, height]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  const pair = { color, height }; maps.set(kind, pair); return pair;
}

/** Project by world metres, including instanced meshes. Brick size never stretches with a building. */
export function surface(kind: SurfaceKind, color: number) {
  const key = `${kind}:${color}`;
  if (materials.has(key)) return materials.get(key)!;
  const pair = texturePair(kind), scale = kind === "plaster" ? .25 : kind === "asphalt" ? .8 : .5;
  const bump = kind === "brick" ? .025 : kind === "paving" || kind === "stone" ? .016 : .009;
  const mat = new THREE.MeshStandardMaterial({ map: pair.color, color, roughness: kind === "asphalt" ? .97 : .83 });
  mat.onBeforeCompile = shader => {
    shader.uniforms.surfaceHeight = { value: pair.height };
    shader.vertexShader = "varying vec3 vSurfacePosition;\nvarying vec3 vSurfaceNormal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <defaultnormal_vertex>", "#include <defaultnormal_vertex>\nvSurfaceNormal=inverseTransformDirection(transformedNormal,viewMatrix);");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 surfacePosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        surfacePosition=instanceMatrix*surfacePosition;
      #endif
      vSurfacePosition=(modelMatrix*surfacePosition).xyz;`);
    shader.fragmentShader = "varying vec3 vSurfacePosition;\nvarying vec3 vSurfaceNormal;\nuniform sampler2D surfaceHeight;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
      vec3 surfaceAxis=abs(normalize(vSurfaceNormal));
      vec2 surfaceUV=surfaceAxis.y>.65 ? vSurfacePosition.xz : (surfaceAxis.x>surfaceAxis.z ? vSurfacePosition.zy : vSurfacePosition.xy);
      surfaceUV*=${scale.toFixed(3)};
      vec4 surfaceSample=texture2D(map,surfaceUV);
      diffuseColor*=surfaceSample;
      float surfaceRelief=texture2D(surfaceHeight,surfaceUV).r;
      // Low-frequency variation prevents entire districts sharing a uniform wash.
      diffuseColor.rgb*=.97+.03*sin(vSurfacePosition.x*.19)*sin(vSurfacePosition.z*.13+vSurfacePosition.y*.17);
      if(surfaceAxis.y<.65) diffuseColor.rgb*=mix(.78,1.0,smoothstep(0.0,2.3,vSurfacePosition.y));`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec3 surfaceDX=dFdx(-vViewPosition), surfaceDY=dFdy(-vViewPosition);
      vec3 surfaceR1=cross(surfaceDY,normal), surfaceR2=cross(normal,surfaceDX);
      float surfaceDet=dot(surfaceDX,surfaceR1);
      vec3 surfaceGrad=sign(surfaceDet)*(dFdx(surfaceRelief)*surfaceR1+dFdy(surfaceRelief)*surfaceR2);
      normal=normalize(abs(surfaceDet)*normal-${bump.toFixed(3)}*surfaceGrad);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(surfaceRelief-.6)*.12,.2,1.0);");
  };
  mat.customProgramCacheKey = () => `metre-surface-${kind}`;
  mat.userData.worldScale = scale; mat.userData.surfaceKind = kind;
  materials.set(key, mat); return mat;
}

export function glazing(color = 0x63818b) {
  const key = `glass:${color}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .18, metalness: .65, envMapIntensity: 1.35 }));
  return materials.get(key)!;
}

/** Low-cost animated ripples; reflections use the prefiltered outdoor sky. */
export function waterMaterial() {
  const key = "canal-water";
  if (materials.has(key)) return materials.get(key)!;
  const mat = new THREE.MeshStandardMaterial({ color: 0x365f66, metalness: .48, roughness: .18 });
  mat.onBeforeCompile = shader => {
    shader.uniforms.waterTime = waterTime;
    shader.vertexShader = "varying vec3 vWaterWorld;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;");
    shader.fragmentShader = "varying vec3 vWaterWorld;\nuniform float waterTime;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec2 ripple=vec2(sin(vWaterWorld.x*3.7+vWaterWorld.z*1.6+waterTime*.8),cos(vWaterWorld.z*4.2-vWaterWorld.x*1.3+waterTime*.65));
      normal=normalize(normal+mat3(viewMatrix)*vec3(ripple.x*.035,0.0,ripple.y*.035));`);
  };
  materials.set(key, mat); return mat;
}
export const waterTime = { value: 0 };
