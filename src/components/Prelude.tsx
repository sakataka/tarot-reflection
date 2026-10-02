import { useEffect, useState } from "react";
import type { MoonPhase } from "../utils/moment";
import { litMoonPath } from "./MoonGlyph";

const storageKey = "tarot-reflection:prelude";
const holdDuration = 2300;
const leaveDuration = 1100;

const shouldPlay = () => {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return globalThis.sessionStorage?.getItem(storageKey) !== "seen";
  } catch {
    return true;
  }
};

const markSeen = () => {
  try {
    globalThis.sessionStorage?.setItem(storageKey, "seen");
  } catch {
    // 覚えられなくても、次に開いたときにもう一度灯りを点けるだけ。
  }
};

// 部屋に入るときの一瞬。暗がりに今夜の月が描かれ、幕が上がる。開いたタブで一度だけ。触れれば飛ばせる。
export const Prelude = ({ moon }: { moon: MoonPhase }) => {
  const [stage, setStage] = useState<"on" | "leaving" | "off">(() => (shouldPlay() ? "on" : "off"));

  useEffect(() => {
    document.documentElement.dataset.prelude = stage;
    if (stage === "on") {
      markSeen();
      const timer = window.setTimeout(() => setStage("leaving"), holdDuration);
      const skip = () => setStage("leaving");
      window.addEventListener("keydown", skip, { once: true });
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("keydown", skip);
      };
    }
    if (stage === "leaving") {
      const timer = window.setTimeout(() => setStage("off"), leaveDuration);
      return () => window.clearTimeout(timer);
    }
  }, [stage]);

  if (stage === "off") return null;

  return (
    <div className={`prelude is-${stage}`} aria-hidden="true" onPointerDown={() => setStage("leaving")}>
      <svg className="prelude-moon" viewBox="-64 -64 128 128">
        <circle className="prelude-ring" r="58" pathLength="1" />
        <circle className="prelude-ticks" r="50" />
        <g className="prelude-disc">
          <circle className="prelude-shadow" r="30" />
          <path className="prelude-lit" d={litMoonPath(moon.age, 30)} />
        </g>
      </svg>
      <p className="prelude-title">Tarot Reflection</p>
      <p className="prelude-sub">{moon.name}・月齢 {moon.age.toFixed(1)}</p>
    </div>
  );
};
