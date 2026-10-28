import { describe, expect, it } from 'vitest';
import { FrameBudget } from '../src/frame-budget';
function frames(b: FrameBudget, dt: number, seconds: number, busy = false) {
  for (let t = 0; t < seconds; t += dt) b.sample(dt, busy);
}
describe('adaptive frame budget', () => {
  it('ignores startup and streaming spikes', () => {
    const b = new FrameBudget(); frames(b, .1, 1); expect(b.level).toBe(0);
    frames(b, 1 / 60, 2); frames(b, .1, .3, true); expect(b.level).toBe(0);
  });
  it('still reduces quality during a sustained heavy streaming load', () => {
    const b = new FrameBudget(); frames(b, .2, 8, true); expect(b.level).toBeGreaterThan(0);
  });
  it('lowers resolution for sustained slow frames and has a finite floor', () => {
    const b = new FrameBudget(); frames(b, .05, 25);
    expect(b.level).toBe(4); expect(b.scale).toBe(.45);
  });
  it('recovers gradually after sustained fast frames, without oscillating', () => {
    const b = new FrameBudget(); frames(b, .04, 5); expect(b.level).toBeGreaterThan(0);
    const level = b.level; frames(b, 1 / 60, 4); expect(b.level).toBe(level);
    frames(b, 1 / 60, 55); expect(b.level).toBe(0);
  });
  it('can reset for manual settings and ignores invalid samples', () => {
    const b = new FrameBudget(); frames(b, .1, 10); b.reset();
    for (const dt of [NaN, Infinity, -1, 0, 5]) b.sample(dt);
    expect(b.level).toBe(0); expect(b.scale).toBe(1);
  });
  it('does not lose its slow-frame history between consecutive streamed chunks',()=>{
    const b=new FrameBudget();frames(b,1/60,2.2);
    for(let n=0;n<12;n++)b.sample(.5,n%3!==2);
    expect(b.level).toBeGreaterThan(0);
  });
  it('can still reduce quality when heavy frames take longer than one second',()=>{
    const b=new FrameBudget();frames(b,1.2,20);expect(b.level).toBeGreaterThan(0);
  });
});
