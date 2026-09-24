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
    <div className="intro-landscape">
      <img src="cards/selection_oracle.webp" alt="月明かりに照らされた静かな庭と水辺" />
    </div>
    <div className="intro-copy">
      <p className="moon-phases" aria-hidden="true">
        <span>☽</span><span>◐</span><span>●</span><span>◑</span><span>☾</span>
      </p>
      <p className="ornament-kicker">Moonlit Tarot</p>
      <h1>今夜のカードに、<br className="mobile-break" />胸の内をたずねる</h1>
      <p>ようこそ。灯りを少し落としましょう。<br />いま心にかかっていることを、ひとつだけ聞かせてください。</p>
    </div>

    <label className="field">
      <span className="field-heading">
        <strong>あなたの問い</strong>
        <small>{question.length} / 300</small>
      </span>
      <textarea
        value={question}
        maxLength={300}
        rows={4}
        placeholder="たとえば「転職を考えています。この迷いは、どこから来ているのでしょう」"
        onChange={(event) => onQuestionChange(event.target.value)}
      />
      <small className="field-note">うまくまとまっていなくて構いません。書いた言葉のぶんだけ、カードは応えてくれます。</small>
    </label>

    <div className="field spread-field">
      <span className="field-heading">
        <strong>カードの並べ方</strong>
        <small>問いの深さに合わせて</small>
      </span>
      <SpreadSelector spreads={spreads} selectedSpreadId={selectedSpreadId} onChange={onSpreadChange} />
    </div>

    <div className="intro-action">
      <button className="primary-button" type="button" disabled={!canShuffle} onClick={onShuffle}>
        <span aria-hidden="true">✦</span>
        <span>カードを混ぜる</span>
        <span aria-hidden="true">✦</span>
      </button>
      <small>{canShuffle ? "問いを胸に置いたまま、どうぞ" : "問いを書くと、カードを混ぜられます"}</small>
    </div>
  </section>
);
