export const POUR_START = 2.95;
export const POUR_END = 4.5;
export const FRY_COUNT = 16;
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const ease = (p: number) => p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export function tinAngle(t: number) {
  return lerp(-10, 3, ease(prog(t, 2.5, POUR_START)))
    + (t >= POUR_START && t < POUR_END ? Math.sin((t - POUR_START) * 5) * 1.2 : 0)
    - 10 * ease(prog(t, 5.15, 5.5));
}

// Mouth and right-hand pivot are measured from the transparent pouring pose.
export function mouthAt(t: number) {
  const angle = tinAngle(t) * Math.PI / 180;
  const dx = (0.18 - 0.64) * 34;
  const dy = (0.76 - 0.60) * (34 * 1.25 * 1200 / 896);
  return {
    x: 21 + 0.64 * 34 + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: 100 - 38 - (34 * 1.25 * 1200 / 896) * 0.40 + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

export const fries = Array.from({ length: FRY_COUNT }, (_, i) => {
  const random = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const start = POUR_START + (i / (FRY_COUNT - 1)) * (POUR_END - POUR_START);
  const source = mouthAt(start);
  const targetY = lerp(76, 56, i / (FRY_COUNT - 1));
  const gravity = 70;
  const velocityY = 4;
  const dur = (Math.sqrt(velocityY ** 2 + 2 * gravity * (targetY - source.y)) - velocityY) / gravity;
  return { start, dur, source, targetY, targetX: source.x - 2 - random(2) * 7, spin: (random(3) - 0.5) * 220, size: 9 + random(4) * 3 };
});

// Each landing contributes smoothly, never filling before the first fry arrives.
export function fillAt(t: number) {
  return fries.reduce((sum, fry) => sum + ease(prog(t, fry.start + fry.dur, fry.start + fry.dur + 0.3)), 0) / FRY_COUNT;
}

export function fryAt(t: number, fry: typeof fries[number]) {
  const elapsed = t - fry.start;
  if (elapsed < 0 || elapsed > fry.dur) return null;
  const p = elapsed / fry.dur;
  return { x: lerp(fry.source.x, fry.targetX, p), y: fry.source.y + 4 * elapsed + 35 * elapsed ** 2, rotation: 70 + p * fry.spin };
}