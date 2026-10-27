import { describe, it, expect } from "vitest";
import { StyleChain } from "../src/style-chain";
import { FIREWORK_MESSAGE, fireworksLayout, fireworkSpark } from "../src/fireworks";
import { aerialPose, figurePose, FigureSkating } from "../src/figure-skating";
import { IceGame } from "../src/ice-games";
import { iceRinks } from "../src/ice-rinks";
describe("variety and replays", () => {
  it("reduces repeated awards, rewards a varied chain once, and clears it on recovery", () => {
    const chain = new StyleChain(); expect(chain.award("backflip",450)).toBe(450); expect(chain.award("backflip",450)).toBeLessThan(450);
    chain.award("mute",180); chain.award("360",360); expect(chain.bonus).toBe(100); expect(chain.bank()).toBe(100); expect(chain.bank()).toBe(0);
    chain.reset(); expect(chain.award("backflip",450)).toBe(450);
  });
  it("changes replay programs and gate layouts, keeping all gates safely inside every rink", () => {
    for (const rink of iceRinks) {
      const rounds = Array.from({length:6},(_,i)=>new IceGame(rink,"spotlight",0,0,i));
      expect(new Set(rounds.map(r=>r.sequence.join())).size).toBe(6);
      for (let attempt=0;attempt<3;attempt++) for(const g of new IceGame(rink,"slalom",0,0,attempt).gates) { expect(Math.abs(g.x-rink.x)).toBeLessThan(12); expect(Math.abs(g.z-rink.z)).toBeLessThan(22); }
    }
  });
  it("uses different jump preparations, moving spin arms and different inline flip silhouettes", () => {
    const loop = figurePose({pose:"loop",phase:"entry",mix:1}), lutz = figurePose({pose:"lutz",phase:"entry",mix:1}); expect(loop.feet).not.toEqual(lutz.feet);
    expect(figurePose({pose:"upright",phase:"performing",mix:1,elapsed:0}).hands).not.toEqual(figurePose({pose:"upright",phase:"performing",mix:1,elapsed:1}).hands);
    expect(aerialPose("frontflip",Math.PI).feet).not.toEqual(aerialPose("backflip",Math.PI).feet);
    expect(aerialPose("leftflip",Math.PI).hands).not.toEqual(aerialPose("rightflip",Math.PI).hands);
  });
});
describe("night fireworks", () => {
  it("covers both cities and the connector with bounded, stable world-space launch sites", () => {
    expect(FIREWORK_MESSAGE).toBe("I LOVE YOU LAYAN");
    for (const x of [-1450,-1060,-450,0,700,1000,1610]) for (const phone of [false,true]) {
      const layout = fireworksLayout({x,z:74},3,phone); expect(layout.length).toBe(phone?4:8);
      expect(layout.some(p=>p.age>2&&p.age<9)).toBe(true);
      for(const p of layout) {expect(p.distance).toBeGreaterThan(200);expect(p.distance).toBeLessThan(660); expect(p.y).toBeGreaterThan(40);}
      expect(fireworksLayout({x,z:74},3,phone)).toEqual(layout);
    }
  });
  it("builds finite heart, ring and starburst shapes without allocating unbounded particles", () => {
    for(let shape=0;shape<4;shape++) for(let i=0;i<112;i++) for(const v of Object.values(fireworkSpark(shape,i,112,.5))) {expect(Number.isFinite(v)).toBe(true);expect(Math.abs(v)).toBeLessThan(30);}
  });
});

describe("render workload", () => {
  it("keeps detailed NPCs within quality budgets and reduces phone work independently of resident count", async () => {
    const { crowdDetailBudget } = await import("../src/render-budget");
    expect(crowdDetailBudget(true,"0.5").count).toBe(2);
    expect(crowdDetailBudget(false,"0.5").count).toBe(4);
    expect(crowdDetailBudget(false,"auto").count).toBeLessThan(20);
    expect(crowdDetailBudget(true,"auto").count).toBeLessThan(crowdDetailBudget(false,"auto").count);
  });
});

describe("spatial instance batching", () => {
  it("culls scenery from the other city without losing either city's meshes", async () => {
    const THREE = await import("three"), { batchGroup } = await import("../src/instance-batches");
    const group = new THREE.Group(), geometry = new THREE.BoxGeometry(1,1,1), material = new THREE.MeshBasicMaterial();
    for(const x of [-1000,1000]) {const box=new THREE.Mesh(geometry,material);box.position.x=x;group.add(box);}
    batchGroup(group,[geometry]);group.updateMatrixWorld(true);
    const camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(1000,2,-10);camera.lookAt(1000,0,0);camera.updateMatrixWorld(true);
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const batches=group.children as import("three").InstancedMesh[];
    expect(batches.reduce((n,b)=>n+b.count,0)).toBe(2);
    expect(batches.filter(b=>frustum.intersectsObject(b)).reduce((n,b)=>n+b.count,0)).toBe(1);
  });
});
