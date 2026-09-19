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
    <img className="intro-landscape" src="/cards/selection_oracle.webp" alt="月明かりに照らされた静かな庭と水辺" />
    <div className="intro-copy">
      <h1>カードを通して、気持ちを整理する</h1>
      <p>心にあるモヤモヤや気がかりを、ひとつだけ書き出してみましょう。</p>
    </div>

    <label className="field">
      <span className="field-heading">
        <strong>相談したいこと</strong>
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
        <strong>カードの並べ方</strong>
        <small>相談に合わせて選んでください</small>
      </span>
      <SpreadSelector spreads={spreads} selectedSpreadId={selectedSpreadId} onChange={onSpreadChange} />
    </div>

    <div className="intro-action">
      <button className="primary-button" type="button" disabled={!canShuffle} onClick={onShuffle}>
        <span>カードを混ぜる</span>
        <span aria-hidden="true">→</span>
      </button>
      <small>{canShuffle ? "選んだカードをもとに、相談を読み解きます" : "相談を書くと進めます"}</small>
    </div>
  </section>
);
