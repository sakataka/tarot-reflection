import type { Spread } from "../types/tarot";
import { SpreadSelector } from "./SpreadSelector";

type QuestionFormProps = {
  question: string;
  spreads: Spread[];
  selectedSpreadId: string;
  canShuffle: boolean;
  onQuestionChange: (question: string) => void;
  onSpreadChange: (spreadId: string) => void;
  onShuffle: () => void;
};

export const QuestionForm = ({
  question,
  spreads,
  selectedSpreadId,
  canShuffle,
  onQuestionChange,
  onSpreadChange,
  onShuffle,
}: QuestionFormProps) => (
  <section className="panel intro-panel">
    <div className="intro-copy">
      <p className="app-kicker">Moonlit Tarot</p>
      <h1>今夜のカードに、胸の内をたずねる</h1>
      <p>静かな卓に問いを置き、伏せられたカードから今の流れを読み解きます。</p>
    </div>

    <label className="field">
      <span>問いかけ</span>
      <textarea
        value={question}
        rows={5}
        placeholder="今、心に引っかかっていることを一つ書いてください。"
        onChange={(event) => onQuestionChange(event.target.value)}
      />
    </label>

    <div className="field">
      <span>スプレッド</span>
      <SpreadSelector spreads={spreads} selectedSpreadId={selectedSpreadId} onChange={onSpreadChange} />
    </div>

    <button className="primary-button" type="button" disabled={!canShuffle} onClick={onShuffle}>
      カードを混ぜる
    </button>
  </section>
);
