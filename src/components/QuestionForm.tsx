import type { ReactNode } from "react";
import type { Spread } from "../types/tarot";
import { engines, type EngineId } from "../utils/engine";
import type { ReadingRecord } from "../utils/history";
import type { MoonPhase } from "../utils/moment";
import { oracleName } from "../utils/persona";
import { SpreadSelector } from "./SpreadSelector";

type QuestionFormProps = {
  question: string;
  spreads: Spread[];
  selectedSpreadId: string;
  canShuffle: boolean;
  moon: MoonPhase;
  isNight: boolean;
  sameNightReading?: ReadingRecord;
  onOpenRecord: (record: ReadingRecord) => void;
  onOpenGuide: () => void;
  // 問いを打ち明けたあと、占い師の問い返しをここに置く。
  clarifySlot?: ReactNode;
  onQuestionChange: (question: string) => void;
  onSpreadChange: (spreadId: string) => void;
  engine: EngineId;
  onEngineChange: (engine: EngineId) => void;
  onConfide: () => void;
};

export const QuestionForm = ({
  question,
  spreads,
  selectedSpreadId,
  canShuffle,
  moon,
  isNight,
  sameNightReading,
  onOpenRecord,
  onOpenGuide,
  clarifySlot,
  onQuestionChange,
  onSpreadChange,
  engine,
  onEngineChange,
  onConfide,
}: QuestionFormProps) => (
  <section className="intro-panel">
    <div className="intro-landscape">
      <img src="cards/selection_oracle.webp" alt="月明かりに照らされた静かな庭と水辺" />
    </div>
    <div className="intro-copy">
      <p className="moon-phases" aria-hidden="true">
        <span>☽</span><span>◐</span><span>{moon.glyph}</span><span>◑</span><span>☾</span>
      </p>
      <p className="ornament-kicker">Moonlit Tarot</p>
      <h1>今夜のカードに、<br className="mobile-break" />胸の内をたずねる</h1>
      <p className="tonight-moon">
        {isNight ? "今夜" : "今日"}は<strong>{moon.name}</strong>。{moon.mood}。
      </p>
      <p>
        ようこそ。灯りを少し落としましょう。<br />いま心にかかっていることを、ひとつだけ聞かせてください。
        <span className="intro-signature">占い部屋の主　{oracleName}</span>
      </p>
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
        readOnly={Boolean(clarifySlot)}
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
      <button className="text-button guide-link" type="button" onClick={onOpenGuide}>
        はじめての方へ ― 占いの流れと、特別なカードのこと
      </button>
    </div>

    <div className="engine-field" role="radiogroup" aria-label={`${oracleName}の言葉を紡ぐAI`}>
      <span>{oracleName}の言葉を紡ぐAI</span>
      <div className="engine-options">
        {engines.map((option) => (
          <button
            key={option.id}
            className={option.id === engine ? "engine-option is-selected" : "engine-option"}
            type="button"
            role="radio"
            aria-checked={option.id === engine}
            disabled={Boolean(clarifySlot)}
            onClick={() => onEngineChange(option.id)}
          >
            <strong>{option.label}</strong>
            <small>{option.model}</small>
          </button>
        ))}
      </div>
    </div>

    {clarifySlot ?? (sameNightReading ? (
      <div className="same-night" role="status">
        <p>
          その問いには、{isNight ? "今夜" : "今日"}すでにカードが答えています。同じ問いを同じ夜に二度たずねると、カードの声はかえって濁ってしまうもの。夜が明けるまで、受け取った言葉のほうを持ち帰ってください。
        </p>
        <button className="secondary-button" type="button" onClick={() => onOpenRecord(sameNightReading)}>
          そのときの言葉を読み返す
        </button>
      </div>
    ) : (
      <div className="intro-action">
        <button className="primary-button" type="button" disabled={!canShuffle} onClick={onConfide}>
          <span aria-hidden="true">✦</span>
          <span>{oracleName}に打ち明ける</span>
          <span aria-hidden="true">✦</span>
        </button>
        <small>{canShuffle ? "カードに触れる前に、少しだけ話を聞かせてください" : "問いを書くと、打ち明けられます"}</small>
      </div>
    ))}
  </section>
);
