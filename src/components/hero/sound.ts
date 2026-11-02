// Generated Web Audio effects — no audio files.
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

export function enableSound() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  void ctx.resume();
}

function noise(dur: number, type: BiquadFilterType, freq: number, gain: number, endFreq?: number) {
  if (!ctx || !noiseBuf) return;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  // The buffer is 1s long: only offset while enough audio remains, or long sounds cut off.
  const maxOffset = Math.max(0, 1 - (dur + 0.05));
  src.start(t, Math.random() * maxOffset, dur + 0.05);
}

function tone(freq: number, dur: number, gain: number, endFreq?: number) {
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  rattle: () => noise(0.04, "bandpass", 1400 + Math.random() * 900, 0.3),
  lid: () => { tone(700, 0.08, 0.3, 200); noise(0.05, "highpass", 2000, 0.3); },
  // Soft continuous rumble under the pour; the fry landings carry the clatter.
  pour: () => noise(1.7, "lowpass", 800, 0.09, 320),
  // Dull, hollow thud of a fry landing on the pile (was a sharp high hiss).
  clatter: () => noise(0.05, "bandpass", 650 + Math.random() * 550, 0.2),
  swoosh: () => noise(0.6, "bandpass", 400, 0.25, 3000),
  pop: () => { tone(500, 0.1, 0.3, 1200); },
  tick: () => tone(2400 + Math.random() * 1200, 0.04, 0.06),
  // Two-note chime confirming sound was switched on, so the tap is never silent.
  confirm: () => { tone(880, 0.09, 0.25, 1320); setTimeout(() => tone(1320, 0.14, 0.22), 90); },
};
