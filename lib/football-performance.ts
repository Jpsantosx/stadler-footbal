import type { Quality } from "./football-engine.ts";

/** A slow governor changes rendering only; physics and controls keep their own clock. */
export function createRenderBudget() {
  let scale = 1, mean = 1 / 60, slow = 0, fast = 0, warmup = 0;
  let requested: Quality | null = null;
  const result = { scale: 1, quality: "ultra" as Quality };
  return {
    sample(seconds: number, quality: Quality, automatic: boolean, active: boolean) {
      if (requested !== quality || !automatic) {
        requested = quality; scale = 1; slow = fast = warmup = 0; mean = 1 / 60;
      }
      if (automatic && active && Number.isFinite(seconds) && seconds > 0 && seconds < .25) {
        mean += (seconds - mean) * (1 - Math.exp(-seconds * 2));
        warmup += seconds;
        slow = mean > .024 ? slow + seconds : 0;
        fast = mean < .018 ? fast + seconds : 0;
        if (warmup > 2 && slow > 1.5) { scale = Math.max(.65, scale - .12); slow = fast = 0; }
        if (warmup > 2 && fast > 5) { scale = Math.min(1, scale + .06); slow = fast = 0; }
      } else if (!active) { slow = fast = 0; }
      result.scale = scale;
      result.quality =
        quality === "performance" || scale < .7 ? "performance"
          : quality === "balanced" ? "balanced"
            : quality === "high" ? (scale < .86 ? "balanced" : "high")
              : scale < .82 ? "balanced"
                : scale < .94 ? "high"
                  : "ultra";
      return result;
    },
  };
}
