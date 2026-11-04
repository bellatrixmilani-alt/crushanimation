import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import wordmark from "@/assets/chipoz-wordmark.png.asset.json";
import { FLAVOURS, FlavourStage } from "@/components/hero/FlavourStage";
import { track } from "@/lib/track";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chipoz Africa — Flavour That Sticks. Chips That Slap." },
      { name: "description", content: "Freshly fried Chipoz and golden nuggets, shaken to order in Kenya's boldest flavours." },
      { property: "og:title", content: "Chipoz Africa — Flavour That Sticks. Chips That Slap." },
      { property: "og:description", content: "One shake, five flavours. Freshly fried and shaken to order in Kenya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [popKey, setPopKey] = useState(0);
  const Pop = ({ children }: { children: string }) =>
    popKey ? <span key={popKey} className="word-pop">{children}</span> : <span>{children}</span>;

  return (
    <div className="min-h-screen">
      <header className="border-b-[3px] border-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center">
            <img src={wordmark.url} alt="Chipoz Africa" className="h-12 w-auto" draggable={false} />
          </a>
          <ul className="hidden gap-7 text-sm font-semibold uppercase md:flex">
            {["Flavours", "Menu", "Story", "Locations"].map((l) => (
              <li key={l}><a href={`#${l.toLowerCase()}`} className="hover:text-primary">{l}</a></li>
            ))}
          </ul>
          <a href="#locations" className="hard-shadow rounded-full bg-primary px-5 py-2 text-sm font-bold uppercase text-primary-foreground">Find Us</a>
        </nav>
      </header>

      <section className="dots-bg overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-block bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">🇰🇪 Made in Kenya · Loaded with flavour</span>
            <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-7xl">
              Flavour that <span className="text-primary"><Pop>sticks.</Pop></span>
              <br />Chips that <span className="text-primary"><Pop>slap.</Pop></span>
            </h1>
            <p className="mt-6 max-w-md text-lg">
              Freshly fried Chipoz and golden nuggets, shaken to order in Kenya's boldest flavours. Pick your size. Pick your magic. Repeat.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#menu" onClick={() => track("menu_click")} className="hard-shadow rounded-full bg-primary px-7 py-4 text-sm font-bold uppercase text-primary-foreground">See the menu</a>
              <a href="#locations" className="rounded-full border-[3px] border-ink bg-cream px-7 py-4 text-sm font-bold uppercase text-ink">Find a store</a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute -inset-3 -rotate-3 rounded-[2rem] bg-frame sm:-inset-5" aria-hidden />
            <div className="relative rounded-[1.5rem] bg-ink p-[3px] shadow-[8px_10px_0_0_var(--ink)]">
              <div className="rounded-[1.4rem] bg-cream p-3">
                <FlavourStage onDone={() => setPopKey((k) => k + 1)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y-[3px] border-ink bg-ink py-4">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-display text-2xl uppercase text-gold">
          {[...FLAVOURS, ...FLAVOURS, ...FLAVOURS, ...FLAVOURS].map((f, i) => <span key={i}>★ {f.name}</span>)}
        </div>
      </div>
    </div>
  );
}
