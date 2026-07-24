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
  <section className="intro-panel">
    <div className="intro-copy">
      <h1>今夜のカードに、胸の内をたずねる</h1>
      <p>心にあるモヤモヤや気がかりを、ひとつだけ書き出してみましょう。</p>
    </div>

    <label className="field">
      <span className="field-heading">
        <strong>問いかけ</strong>
        <small>{question.length} / 300</small>
      </span>
      <textarea
        value={question}
        maxLength={300}
        rows={4}
        placeholder="ここに、いま気になっていることを自由に書いてください。"
        onChange={(event) => onQuestionChange(event.target.value)}
      />
      <small className="field-note">答えを決めつけず、今の気持ちが伝わる言葉で十分です。</small>
    </label>

    <div className="field spread-field">
      <span className="field-heading">
        <strong>スプレッドを選ぶ</strong>
        <small>カードの枚数で、読み解く深さが変わります</small>
      </span>
      <SpreadSelector spreads={spreads} selectedSpreadId={selectedSpreadId} onChange={onSpreadChange} />
    </div>

    <div className="intro-action">
      <button className="primary-button" type="button" disabled={!canShuffle} onClick={onShuffle}>
        <span>カードを混ぜる</span>
        <span aria-hidden="true">✦</span>
      </button>
      <small>{canShuffle ? "深呼吸をして、準備ができたら進みましょう" : "問いを置くと、カードを混ぜられます"}</small>
    </div>
  </section>
);
