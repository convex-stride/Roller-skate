/** Repeated moves lose freshness; three distinct elements earn a banked variety bonus. */
export class StyleChain {
  private recent: string[] = [];
  private elements = new Set<string>();
  freshness = 1;
  award(key: string, points: number) {
    const repeats = this.recent.filter(k => k === key).length;
    this.freshness = [1, .85, .65, .45, .4, .4][Math.min(5, repeats)];
    this.recent.push(key); if (this.recent.length > 5) this.recent.shift();
    this.elements.add(key);
    return Math.round(points * this.freshness);
  }
  get bonus() { return Math.max(0, this.elements.size - 2) * 100; }
  bank() { const bonus = this.bonus; this.elements.clear(); return bonus; }
  reset() { this.elements.clear(); this.recent = []; this.freshness = 1; }
  get view() { return { unique: this.elements.size, bonus: this.bonus, freshness: this.freshness }; }
}
