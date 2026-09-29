import { useRef, useState } from "react";
import type { Reading } from "../types/tarot";
import type { ReadingRecord } from "../utils/history";
import { playFlip } from "../utils/sound";
import { tableCards } from "../utils/tarot";
import { PromptBox } from "./PromptBox";
import { ReadingHeading, TableStrip } from "./ReadingTable";

type ReadingStageProps = {
  reading: Reading;
  active: boolean;
  onRecordsChange: () => void;
  onSaved?: (record: ReadingRecord) => void;
};

// カードは伏せたまま卓に置き、占い師が語りながら一枚ずつ表に返す。最後に山の底をめくる。
export const ReadingStage = ({ reading, active, onSaved, onRecordsChange }: ReadingStageProps) => {
  const total = tableCards(reading).length;
  const [revealed, setRevealed] = useState<boolean[]>(() => Array.from({ length: total }, () => false));
  const [current, setCurrent] = useState<number | null>(null);

  // 語りの進行から同じ描画中に続けて呼ばれても二重にめくらないよう、最新の状態を ref で持つ。
  const revealedRef = useRef(revealed);

  const revealCard = (cardIndex: number) => {
    const next = revealedRef.current.map((isRevealed, index) => isRevealed || index === cardIndex);
    if (next.every((isRevealed, index) => isRevealed === revealedRef.current[index])) return;
    playFlip();
    revealedRef.current = next;
    setRevealed(next);
  };

  return (
    <div className="reading-stage">
      <ReadingHeading reading={reading} />
      <TableStrip reading={reading} revealed={revealed} current={current} />
      <PromptBox active={active} onRecordsChange={onRecordsChange} reading={reading} revealed={revealed} onRevealCard={revealCard} onCurrentChange={setCurrent} onSaved={onSaved} />
    </div>
  );
};
