import { useEffect, useState } from "react";
import type { Reading } from "../types/tarot";
import { playFlip } from "../utils/sound";
import { PromptBox } from "./PromptBox";
import { ReadingResult } from "./ReadingResult";

const firstFlipDelay = 900;
const flipInterval = 1100;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type ReadingStageProps = {
  reading: Reading;
};

// 卓に伏せて置いたカードを一枚ずつ表に返し、すべて開いてから占い師の言葉を渡す。
export const ReadingStage = ({ reading }: ReadingStageProps) => {
  const total = reading.cards.length;
  const [revealedCount, setRevealedCount] = useState(() => (prefersReducedMotion() ? total : 0));

  useEffect(() => {
    if (revealedCount >= total) return;
    const timer = window.setTimeout(() => {
      playFlip();
      setRevealedCount((count) => count + 1);
    }, revealedCount === 0 ? firstFlipDelay : flipInterval);
    return () => window.clearTimeout(timer);
  }, [revealedCount, total]);

  const isFullyRevealed = revealedCount >= total;

  return (
    <>
      <ReadingResult
        reading={reading}
        revealedCount={revealedCount}
        onRevealAll={isFullyRevealed ? undefined : () => setRevealedCount(total)}
      />
      <PromptBox reading={reading} isReady={isFullyRevealed} />
    </>
  );
};
