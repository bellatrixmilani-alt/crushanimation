type W = Window & { dataLayer?: Record<string, unknown>[] };

export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  (w.dataLayer ||= []).push({ event, ...props });
}
