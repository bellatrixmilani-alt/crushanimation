import { useEffect, useRef, useState } from "react";
import mascotPour from "@/assets/potato-pour.webp";
import bowlLogo from "@/assets/chipoz-logo.png.asset.json";
import friesPile from "@/assets/fries-pile.png.asset.json";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";

// Scene in stage % coords. Bowl centred at bottom; rim line at RIM.
const RIM = 64;
const POUR_END = 5.2;
const END = 6.2;
const N = 44;
const SRC = { x: 9, y: 34 }; // mascot's container mouth
const clamp = (p: number) => Math.max(0, Math.min(1, p));
const ease = (p: number) => 1 - Math.pow(1 - p, 3);

const fries = Array.from({ length: N }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    start: 0.3 + (i / N) * (POUR_END - 1.3),
    dur: 0.85 + r(1) * 0.3,
    dx: 44 + r(2) * 12, // landing x
    jitter: (r(3) - 0.5) * 4,
    spin: (r(4) > 0.5 ? 1 : -1) * (240 + r(5) * 360),
    len: 5 + r(6) * 2.5,
  };
});

export function PourStage({ onDone }: { onDone?: () => void }) {
  const [t, setT] = useState(0);
  const start = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const fired = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setT(END + 5); return; }
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!document.hidden) { acc += dt; setT(acc - start.current); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const replay = () => { start.current = acc; fired.current = false; };
    (window as unknown as { __pourReplay?: () => void }).__pourReplay = replay;
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!fired.current && t >= END) { fired.current = true; doneRef.current?.(); }
  }, [t]);

  const replay = () => {
    track("replay_click");
    (window as unknown as { __pourReplay?: () => void }).__pourReplay?.();
    setT(0);
  };

  const landed = fries.filter((f) => t >= f.start + f.dur).length;
  const fill = ease(clamp(landed / N));
  const pouring = t < POUR_END;
  const bob = Math.sin(t * 2.2) * 1.2;
  const tilt = pouring ? -18 + Math.sin(t * 6) * 3 : -4;
  const sinceFull = t - END;
  const bounce = sinceFull >= 0 && sinceFull < 0.5 ? Math.sin((sinceFull / 0.5) * Math.PI) * 4 : 0;
  const pilePop = sinceFull >= 0 && sinceFull < 0.3 ? 1 + Math.sin((sinceFull / 0.3) * Math.PI) * 0.05 : 1;

  return (
    <div className="w-full">
      <div
        className="pour-scene relative w-full overflow-hidden rounded-[1.25rem] border-[3px] border-ink"
        style={{ aspectRatio: "4 / 5", containerType: "inline-size" }}
        role="img"
        aria-label="Chipoz potato pouring fries into a branded bowl"
      >
        <div className="absolute inset-x-0 bottom-0 h-[26%] marble" />

        {/* Mascot high above, to the side */}
        <div
          className="absolute"
          style={{ left: "2%", top: "2%", width: "36%", aspectRatio: "896 / 1200", transform: `translateY(${bob - bounce}%) rotate(${tilt * 0.25}deg)`, transformOrigin: "60% 70%" }}
        >
          <img src={mascotPour} alt="" className="h-full w-full" draggable={false} />
        </div>

        {/* Real fries pile (behind bowl front), grows as fries land */}
        <img
          src={friesPile.url}
          alt=""
          draggable={false}
          className="absolute"
          style={{
            left: "22%", width: "56%", top: `${RIM - 17}%`,
            clipPath: `inset(${(1 - fill) * 100}% 0 0 0)`,
            transform: `translateY(${(1 - fill) * 8}%) scale(${pilePop})`,
            transformOrigin: "50% 100%",
          }}
        />

        {/* Falling fries: cartoon above the rim, real (behind bowl) below */}
        {fries.map((f, i) => {
          const p = (t - f.start) / f.dur;
          if (p < 0 || p > 1) return null;
          const x = SRC.x + (f.dx - SRC.x) * ease(p) + f.jitter * p;
          const y = SRC.y + (RIM + 4 - SRC.y) * p * p;
          const below = y >= RIM;
          const sinceRim = below ? (y - RIM) / 4 : 0;
          const pop = below && sinceRim < 1 ? 1 + Math.sin(sinceRim * Math.PI) * 0.1 : 1;
          const style = { left: `${x}%`, top: `${y}%`, width: "1.8%", height: `${f.len}%`, transform: `rotate(${p * f.spin}deg) scale(${pop})` };
          return below ? (
            <span key={i} className="real-fry absolute rounded-[3px]" style={{ ...style, opacity: clamp(sinceRim * 3) }} />
          ) : (
            <span key={i} className="absolute rounded-full border-2 border-ink bg-fry" style={style} />
          );
        })}

        {/* Bowl front (CSS) */}
        <div className="absolute" style={{ left: "18%", width: "64%", top: `${RIM - 1}%`, height: "27%" }}>
          <div className="bowl-shadow absolute -bottom-[6%] left-[8%] h-[14%] w-[84%] rounded-[50%]" />
          <div className="bowl-body absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)" }}>
            <div className="bowl-panel absolute inset-y-0 right-0 w-[24%]">
              <p className="absolute left-[8%] top-[22%] w-[90%] -rotate-12 font-display text-[1.8cqw] uppercase leading-tight text-bowl-yellow">The best flavoured fries in town</p>
            </div>
            <img src={bowlLogo.url} alt="" draggable={false} className="absolute left-[24%] top-[14%] w-[44%]" />
          </div>
          <div className="absolute -left-[1%] -top-[4%] h-[9%] w-[102%] rounded-full border-2 border-ink/20 bg-cream" />
        </div>

        {t >= END && (
          <div className="absolute bottom-[3%] right-[3%] z-10">
            <Button variant="ghost" onClick={replay} className="rounded-full border-2 border-ink bg-cream px-3 py-1.5 text-xs font-bold uppercase text-ink hard-shadow">
              ↻ Pour again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
