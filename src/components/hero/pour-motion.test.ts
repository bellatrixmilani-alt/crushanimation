import { describe, expect, it } from "vitest";
import { fillAt, fries, fryAt, mouthAt, POUR_START } from "./pour-motion";

describe("connected pour", () => {
  it("starts every fry at the tilted tin mouth and lands under gravity", () => {
    for (const fry of fries) {
      expect(fryAt(fry.start, fry)?.x).toBeCloseTo(mouthAt(fry.start).x);
      expect(fryAt(fry.start, fry)?.y).toBeCloseTo(mouthAt(fry.start).y);
      expect(fryAt(fry.start + fry.dur - 0.000001, fry)?.y).toBeCloseTo(fry.targetY, 3);
      expect(fryAt(fry.start - 0.01, fry)).toBeNull();
      expect(fryAt(fry.start + fry.dur + 0.01, fry)).toBeNull();
    }
  });
  it("fills only as fries land and increases smoothly to a full bowl", () => {
    expect(fillAt(POUR_START)).toBe(0);
    expect(fillAt(5.5)).toBe(1);
    let previous = 0;
    for (let t = 0; t < 6; t += 0.01) {
      const fill = fillAt(t);
      expect(fill).toBeGreaterThanOrEqual(previous);
      expect(fill - previous).toBeLessThan(0.02);
      previous = fill;
    }
  });
});