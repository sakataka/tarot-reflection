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
      <p className="app-kicker">Tarot Reflection</p>
      <h1>カードの象徴で、相談内容を整理する</h1>
      <p>
        このアプリは、未来を断定する占いではなく、タロット風の象徴を使って考えをほぐすローカルツールです。
      </p>
    </div>

    <label className="field">
      <span>相談内容</span>
      <textarea
        value={question}
        rows={5}
        placeholder="気になっていること、整理したいことを書いてください。"
        onChange={(event) => onQuestionChange(event.target.value)}
      />
    </label>

    <div className="field">
      <span>スプレッド</span>
      <SpreadSelector spreads={spreads} selectedSpreadId={selectedSpreadId} onChange={onSpreadChange} />
    </div>

    <div className="notice">
      このアプリは、タロットカードの象徴を使った遊び・内省支援ツールです。結果は未来を保証するものではありません。
      医療、法律、投資、重大な人生判断については、専門家や信頼できる人に相談してください。
    </div>

    <button className="primary-button" type="button" disabled={!canShuffle} onClick={onShuffle}>
      シャッフル
    </button>
  </section>
);
