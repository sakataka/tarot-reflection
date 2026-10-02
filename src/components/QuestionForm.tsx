import type { ReactNode } from "react";
import type { Spread } from "../types/tarot";
import type { ReadingRecord } from "../utils/history";
import { maxQuestionLength } from "../utils/limits";
import type { MoonPhase } from "../utils/moment";
import { oracleName } from "../utils/persona";
import { MoonGlyph } from "./MoonGlyph";
import { MoonlitScene } from "./MoonlitScene";
import { RevealText } from "./RevealText";
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
  onConfide,
}: QuestionFormProps) => {
  const tonight = isNight ? "今夜" : "今日";
  const selectedSpread = spreads.find((spread) => spread.id === selectedSpreadId) ?? spreads[0];

  return (
    <section className={clarifySlot ? "intro-panel is-confiding" : "intro-panel"}>
      <div className="intro-hero">
        <MoonlitScene moon={moon} />
        <div className="intro-copy">
          <p className="ornament-kicker">Moonlit Tarot</p>
          <h1><RevealText lines={["今夜のカードに、", "胸の内をたずねる"]} delay={500} /></h1>
          <p className="tonight-moon">
            <MoonGlyph age={moon.age} className="tonight-moon-glyph" />
            {tonight}は<strong>{moon.name}</strong>
            <span className="tonight-moon-age">月齢 {moon.age.toFixed(1)}</span>
            <span className="tonight-moon-mood">{moon.mood}。</span>
          </p>
          <p className="intro-greeting">
            ようこそ。灯りを少し落としましょう。<br />いま心にかかっていることを、ひとつだけ聞かせてください。
            <span className="intro-signature">占い部屋の主　{oracleName}</span>
          </p>
        </div>
      </div>

      {clarifySlot ? (
        // 打ち明けたあとは、書いた問いと並べ方を控えめに残し、占い師とのやりとりに目を向ける。
        <div className="confided">
          <p className="confided-label">あなたの問い</p>
          <p className="confided-question">{question.trim()}</p>
          <p className="confided-spread">{selectedSpread.name}で占います</p>
        </div>
      ) : (
        <>
          <label className="field question-field">
            <span className="field-heading">
              <strong>あなたの問い</strong>
              <small>{question.length} / {maxQuestionLength}</small>
            </span>
            <textarea
              value={question}
              maxLength={maxQuestionLength}
              rows={4}
              placeholder="たとえば「転職を考えています。この迷いは、どこから来ているのでしょう」"
              onChange={(event) => onQuestionChange(event.target.value)}
            />
            <small className="field-note">まとまっていなくて構いません。話すように書いた言葉のぶんだけ、カードは応えてくれます。</small>
          </label>

          <div className="field spread-field">
            <span className="field-heading">
              <strong>カードの並べ方</strong>
              <button className="text-button guide-link" type="button" onClick={onOpenGuide}>はじめての方へ</button>
            </span>
            <SpreadSelector spreads={spreads} selectedSpreadId={selectedSpreadId} onChange={onSpreadChange} />
            <p className="spread-description" aria-live="polite">{selectedSpread.description}</p>
          </div>
        </>
      )}

      {clarifySlot ?? (sameNightReading ? (
        <div className="same-night" role="status">
          <p>
            その問いには、{tonight}すでにカードが答えています。同じ問いを同じ夜に二度たずねると、カードの声はかえって濁ってしまうもの。夜が明けるまで、受け取った言葉のほうを持ち帰ってください。
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
};
