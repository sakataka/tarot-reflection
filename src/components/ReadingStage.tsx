import { useRef, useState } from "react";
import type { Reading } from "../types/tarot";
import type { ReadingRecord } from "../utils/history";
import { playFlip } from "../utils/sound";
import { tableCards } from "../utils/tarot";
import { PromptBox } from "./PromptBox";
import { ReadingResult } from "./ReadingResult";

type ReadingStageProps = {
  reading: Reading;
  onSaved?: (record: ReadingRecord) => void;
};

// カードは伏せたまま卓に置き、占い師が語りながら一枚ずつ表に返す。最後に山の底をめくる。
export const ReadingStage = ({ reading, onSaved }: ReadingStageProps) => {
  const total = tableCards(reading).length;
  const [revealed, setRevealed] = useState<boolean[]>(() => Array.from({ length: total }, () => false));

  // 語りの進行から同じ描画中に続けて呼ばれても二重にめくらないよう、最新の状態を ref で持つ。
  const revealedRef = useRef(revealed);

  const updateRevealed = (next: boolean[]) => {
    if (next.every((isRevealed, index) => isRevealed === revealedRef.current[index])) return;
    playFlip();
    revealedRef.current = next;
    setRevealed(next);
  };

  const revealCard = (cardIndex: number) =>
    updateRevealed(revealedRef.current.map((isRevealed, index) => isRevealed || index === cardIndex));

  const revealAll = () => updateRevealed(revealedRef.current.map(() => true));

  return (
    <>
      <ReadingResult
        reading={reading}
        revealed={revealed}
        onRevealAll={revealed.every(Boolean) ? undefined : revealAll}
      />
      <PromptBox reading={reading} revealed={revealed} onRevealCard={revealCard} onSaved={onSaved} />
    </>
  );
};
