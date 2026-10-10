import { useCallback, useEffect, useRef, useState } from "react";
import mascotBody from "@/assets/potato-shake-real.webp";
import mascotTin from "@/assets/potato-tin.webp";
import mascotPour from "@/assets/potato-pour-real.webp";
import mascotCollect from "@/assets/potato-collect-real.webp";
import realFry from "@/assets/real-fry.webp";
import bowlLogo from "@/assets/chipoz-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import bowlBbq from "@/assets/bowl-pattern-real.webp";
import bowlEmpty from "@/assets/bowl-empty.png";
import { enableSound, sfx } from "./sound";
import { track } from "@/lib/track";

type Flavour = { name: string; tint: string; bowl?: string; hue: string };
// Bowls without their own photo fall back to the Chilly BBQ bowl with a CSS tint.
export const FLAVOURS: Flavour[] = [
  { name: "Chilly BBQ", tint: "var(--tint-bbq)", bowl: bowlBbq, hue: "none" },
  { name: "Cheese", tint: "var(--tint-cheese)", hue: "sepia(0.25) saturate(0.85) brightness(1.15)" },
  { name: "Sweet Corn", tint: "var(--tint-corn)", hue: "saturate(0.6) brightness(1.25)" },
  { name: "Sour Cream & Onion", tint: "var(--tint-sco)", hue: "saturate(0.35) brightness(1.3)" },
  { name: "Chilly Lemon", tint: "var(--tint-lemon)", hue: "hue-rotate(8deg) saturate(0.7) brightness(1.2)" },
];

const SWAPS = [6.8, 8.1, 9.4, 10.7]; // flavours 1..4
const END = 12;
const COLLECT_DURATION = 1.4;
const FRIES = 38;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const clamp = (p: number) => Math.max(0, Math.min(1, p));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// Pre-computed fry paths (stage % coords)
const fries = Array.from({ length: FRIES }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    start: 2.65 + (i / FRIES) * 1.4,
    dur: 0.3 + r(1) * 0.15,
    x1: 29 + r(2) * 8,
    y1: 78 + r(3) * 2,
    spin: (r(5) > 0.5 ? 1 : -1) * (20 + r(6) * 45),
  };
});

type Mode = { kind: "auto" } | { kind: "static"; flavour: number; swapAt: number };

export function FlavourStage({ onDone }: { onDone?: () => void }) {
  const [t, setT] = useState(-COLLECT_DURATION);
  const [mode, setMode] = useState<Mode>({ kind: "auto" });
  const [now, setNow] = useState(0);
  const [sound, setSound] = useState(false);
  const [started, setStarted] = useState(false);
  const [playbackKey, setPlaybackKey] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const prevT = useRef(0);
  const soundRef = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Desktop starts on entry; smaller screens wait for the stage to be visible.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMode({ kind: "static", flavour: 0, swapAt: -10 });
      return;
    }
    if (window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) {
      setStarted(true);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    let hasScrolled = window.scrollY > 0;
    const startIfVisible = () => {
      const rect = stage.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      if (hasScrolled && visibleHeight >= rect.height * 0.35) {
        setStarted(true);
        observer.disconnect();
        window.removeEventListener("scroll", onScroll);
      }
    };
    const onScroll = () => {
      hasScrolled = true;
      startIfVisible();
    };
    const observer = new IntersectionObserver(startIfVisible, { threshold: 0.35 });
    observer.observe(stage);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Clock: advances only while tab is visible (rAF pauses when hidden; delta clamped).
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    let last = performance.now();
    const stopAt = mode.kind === "auto" ? autoStart.current + COLLECT_DURATION + END : mode.swapAt + 0.8;
    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!document.hidden) {
        elapsed.current = Math.min(stopAt, elapsed.current + dt);
        setNow(elapsed.current);
      }
      if (elapsed.current < stopAt) raf = requestAnimationFrame(loop);
    };
    const onVis = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, [started, mode, playbackKey]);

  const autoStart = useRef(0);
  useEffect(() => {
    if (mode.kind !== "auto" || !started) return;
    const nt = Math.min(END, now - autoStart.current - COLLECT_DURATION);
    const p = prevT.current;
    if (soundRef.current) {
      const crossed = (x: number) => p < x && nt >= x;
      if (nt > 0.5 && nt < 2.4 && Math.floor(nt * 12) !== Math.floor(p * 12)) sfx.rattle();
      if (crossed(2.5)) sfx.lid();
      if (crossed(2.65)) sfx.pour();
      fries.forEach((f) => crossed(f.start + f.dur) && sfx.click());
      if (crossed(5.2)) sfx.swoosh();
      [4.6, ...SWAPS].forEach((x) => { if (crossed(x)) { sfx.pop(); [0.05, 0.12, 0.2].forEach((d) => setTimeout(sfx.tick, d * 1000)); } });
    }
    if (p < END && nt >= END) doneRef.current?.();
    prevT.current = nt;
    setT(nt);
  }, [now, mode.kind, started]);

  const restart = useCallback(() => {
    autoStart.current = elapsed.current;
    prevT.current = -COLLECT_DURATION;
    setT(-COLLECT_DURATION);
    setMode({ kind: "auto" });
    setStarted(true);
    setPlaybackKey((key) => key + 1);
  }, []);

  const pick = (i: number) => {
    track("flavour_chip_click", { flavour: FLAVOURS[i]?.name });
    setMode({ kind: "static", flavour: i, swapAt: elapsed.current });
    if (soundRef.current) { sfx.pop(); setTimeout(sfx.tick, 80); }
  };

  const toggleSound = () => {
    enableSound();
    soundRef.current = true;
    setSound(true);
  };

  // ---- Derived scene state ----
  const isStatic = mode.kind === "static";
  const T = isStatic ? END + 1 : t;
  let flavour = 0;
  let swapT = 4.6;
  if (isStatic) { flavour = mode.flavour; swapT = -100; }
  else SWAPS.forEach((s, i) => { if (T >= s) { flavour = i + 1; swapT = s; } });
  const sinceSwap = isStatic ? now - mode.swapAt : T - swapT;
  const done = isStatic || T >= END;

  const collecting = !isStatic && T < 0;
  const shaking = T >= 0.5 && T < 2.4;
  const pouring = T >= 2.5;
  const approach = ease(prog(T, 1.8, 2.5));
  const shakeX = shaking ? Math.sin(T * Math.PI * 2 * 12) * 5 : 0;
  const leave = ease(prog(T, 5.2, 6.1));
  const glide = ease(prog(T, 5.2, 6.1));
  const fill = ease(prog(T, 2.65, 4.5));
  const bowlIn = 1;
  const popScale = sinceSwap >= 0 && sinceSwap < 0.25 ? lerp(1.12, 1, sinceSwap / 0.25) : 1;
  const pillShow = T >= 4.6;
  const pillScale = sinceSwap >= 0 && sinceSwap < 0.3 ? lerp(0.6, 1, ease(sinceSwap / 0.3)) : 1;
  const f = FLAVOURS[flavour] ?? FLAVOURS[0];
  if (!f) return null;

  // Mascot box (stage %): left 60, width 34, bottom 26.
  const bowl = {
    left: lerp(6, 20, glide),
    width: lerp(34, 60, glide),
    bottom: lerp(4, 2, glide),
  };

  return (
    <div className="w-full">
      <div
        ref={stageRef}
        data-playback={done ? "finished" : started ? "playing" : "waiting"}
        data-phase={done ? "finished" : collecting ? "collect" : pouring ? "pour" : "shake"}
        className="relative w-full overflow-hidden rounded-[1.25rem] border-[3px] border-ink"
        style={{ aspectRatio: "5 / 4", background: f.tint, transition: "background-color 200ms linear", containerType: "inline-size" }}
        aria-label={`Chipoz animation showing ${f.name}`}
        role="img"
      >
        {/* Mascot */}
        {leave < 1 && (
          <div
            className="absolute"
            style={{ left: `${lerp(60, 32, approach)}%`, width: "34%", bottom: `${lerp(26, 14, approach)}%`, aspectRatio: "896 / 1200", transform: `translateX(${leave * 180}%)`, opacity: 1 - leave }}
          >
            <img src={collecting ? mascotCollect : pouring ? mascotPour : mascotBody} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
            {!collecting && !pouring && (
              <img src={mascotTin} alt="" className="absolute inset-0 h-full w-full" draggable={false} style={{ transform: `translateX(${shakeX}px)` }} />
            )}
            {shaking && (
              <div className="absolute" style={{ left: "15%", top: "56%", width: "70%", height: "20%" }}>
                <ShakeFx t={T} />
              </div>
            )}
            {/* Lid popping off */}
            {pouring && T < 3.3 && (
              <div
                className="absolute rounded-full border-2 border-ink bg-muted-foreground"
                style={{
                  left: "12%", top: "77%", width: "6%", aspectRatio: "1 / 2.4",
                  transform: `translate(${-prog(T, 2.5, 3.3) * 120}cqw, ${(-30 * prog(T, 2.5, 3.3) + 140 * prog(T, 2.5, 3.3) ** 2) * 1}%) rotate(${prog(T, 2.5, 3.3) * -540}deg)`,
                }}
              />
            )}
          </div>
        )}

        {/* Bowl with bottom-up fill reveal */}
        <div
          className="absolute"
          style={{ left: `${bowl.left}%`, width: `${bowl.width}%`, bottom: `${bowl.bottom}%`, opacity: bowlIn, transform: `scale(${done || T >= 6.8 ? popScale : 1})`, transformOrigin: "50% 80%" }}
        >
          <img
            src={bowlEmpty}
            alt=""
            className="w-full"
            draggable={false}
          />
          <img
            src={bowlBbq}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full"
            style={{ filter: f.bowl ? "none" : f.hue, clipPath: `inset(${lerp(58, 0, isStatic ? 1 : fill)}% 0 42% 0)`, opacity: isStatic || fill > 0 ? 1 : 0 }}
          />
          <img
            src={bowlLogo.url}
            alt=""
            draggable={false}
            className="absolute left-[34%] top-[63%] w-[32%]"
          />
          {(T >= 6.8 || isStatic) && sinceSwap >= 0 && sinceSwap < 0.7 && <SparkRing p={sinceSwap / 0.7} color={f.tint} />}
        </div>

        {/* Falling fries */}
        {!isStatic && T > 2.6 && T < 4.6 &&
          fries.map((fr, i) => {
            const p = (T - fr.start) / fr.dur;
            if (p < 0 || p > 1) return null;
            const x = lerp(35.4, fr.x1, p);
            const y = lerp(73, fr.y1, p * p);
            return (
              <img
                key={i}
                src={realFry}
                alt=""
                draggable={false}
                className="pointer-events-none absolute"
                style={{ left: `${x}%`, top: `${y}%`, width: "5%", transform: `translate(-50%, -50%) rotate(${65 + p * fr.spin}deg)` }}
              />
            );
          })}

        {/* Flavour pill */}
        {pillShow && (
          <div className="absolute left-1/2 top-[5%] z-10 -translate-x-1/2">
            <div
              className="hard-shadow whitespace-nowrap rounded-full border-2 border-ink bg-ink px-[3.5cqw] py-[1.4cqw] font-display text-[3.6cqw] uppercase tracking-wide text-gold"
              style={{ transform: `scale(${pillScale})` }}
            >
              {f.name}
            </div>
            {sinceSwap >= 0 && sinceSwap < 0.6 &&
              [-1, 1, -0.5, 0.6].map((d, i) => (
                <span key={i} className="absolute text-[3cqw] text-cream" style={{ left: `${50 + d * 60}%`, top: `${-20 + i * 30}%`, opacity: 1 - sinceSwap / 0.6, transform: `scale(${0.5 + sinceSwap * 2})` }}>✦</span>
              ))}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-[3%] right-[3%] z-10 flex gap-2">
          {done && (
            <Button variant="ghost"
              onClick={() => { track("replay_click"); restart(); }}
              className="rounded-full border-2 border-ink bg-cream px-3 py-1.5 text-xs font-bold uppercase text-ink hard-shadow"
            >
              ↻ Replay
            </Button>
          )}
          {!sound && (
            <Button variant="ghost" onClick={toggleSound} className="rounded-full border-2 border-ink bg-ink px-3 py-1.5 text-xs font-bold uppercase text-gold hard-shadow">
              🔊 Tap for sound
            </Button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose a flavour">
        {FLAVOURS.map((fl, i) => {
          const active = flavour === i && (pillShow || isStatic);
          return (
            <Button variant="ghost"
              key={fl.name}
              aria-pressed={active}
              onClick={() => pick(i)}
              className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase transition-colors sm:text-sm ${active ? "bg-ink text-gold" : "bg-cream text-ink hover:bg-gold"}`}
            >
              {fl.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ShakeFx({ t }: { t: number }) {
  const phase = (t * 6) % 1;
  return (
    <>
      {[0, 1].map((end) => (
        <div key={end} className="absolute top-1/2 -translate-y-1/2" style={{ [end ? "right" : "left"]: "-14%", width: "14%", height: "70%" }}>
          {[0, 1, 2].map((l) => (
            <span key={l} className="absolute h-[3px] rounded bg-ink" style={{ top: `${20 + l * 30}%`, width: `${60 - l * 10}%`, [end ? "left" : "right"]: "10%", opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 20 + l)) }} />
          ))}
          {[0, 1, 2, 3].map((k) => {
            const pp = (phase + k / 4) % 1;
            return (
              <span key={`p${k}`} className="absolute rounded-full bg-frame" style={{ width: "22%", aspectRatio: "1", top: `${20 + k * 18 - pp * 30}%`, [end ? "left" : "right"]: `${-pp * 60}%`, opacity: 0.7 * (1 - pp), transform: `scale(${0.5 + pp})` }} />
            );
          })}
        </div>
      ))}
    </>
  );
}

function SparkRing({ p, color }: { p: number; color: string }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[45%]">
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = lerp(10, 34, ease(p));
        return (
          <span
            key={i}
            className="absolute rounded-full border border-ink"
            style={{ width: "1.6cqw", height: "1.6cqw", left: `${Math.cos(a) * r}cqw`, top: `${Math.sin(a) * r * 0.8}cqw`, backgroundColor: color, filter: "saturate(1.6) brightness(0.9)", opacity: 1 - p }}
          />
        );
      })}
    </div>
  );
}
