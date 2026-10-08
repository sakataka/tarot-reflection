import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Reading } from "../types/tarot";
import { drawKeepsake, keepsakeFileName } from "../utils/keepsake";
import { answerLabel, moonPhase, roomHour, timeBand, type RoomHour } from "../utils/moment";
import { oracleName } from "../utils/persona";
import { playSnuff } from "../utils/sound";
import { MoonGlyph } from "./MoonGlyph";
import { OraclePortrait } from "./OraclePortrait";

type FarewellProps = {
  reading: Reading;
  answer: string;
  onCancel: () => void;
  // 蝋燭を吹き消した瞬間（部屋の音を止める）。
  onDarken: () => void;
  // 暗がりから、もう一度灯りをともす。
  onRelight: () => void;
};

// 見送りの言葉は、占った時刻に合わせて変える。
const partingWords: Record<RoomHour, string[]> = {
  night: ["今夜はここまで。持ち帰るのは、その答えだけでいいの。", "灯りを消しますね。……おやすみなさい。"],
  dusk: ["夜はまだ始まったばかり。けれど、この卓はここまで。", "灯りを消しますね。帰り道は、足もとに気をつけて。"],
  morning: ["もう朝ね。眠れなかったぶん、今日はゆっくり歩きなさい。", "灯りを消しますね。カーテンを開けるのは、あなたが出てから。"],
  day: ["外の明るさに戻ったら、この部屋のことは半分忘れていいの。答えだけ、胸にしまって。", "灯りを消しますね。"],
};

type Stage = "parting" | "snuffing" | "dark";
const snuffDuration = 2600;

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// 読み終えたら、次の問いを促さずに見送る。封書を手渡し、蝋燭を吹き消して、部屋は暗くなる。
export const Farewell = ({ reading, answer, onCancel, onDarken, onRelight }: FarewellProps) => {
  const [stage, setStage] = useState<Stage>("parting");
  const [saving, setSaving] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const askedAt = new Date(reading.createdAt);
  const moon = moonPhase(askedAt);
  const [parting, goodnight] = partingWords[roomHour(new Date())];
  const firstRef = useRef<HTMLButtonElement>(null);
  const relightRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
    document.documentElement.dataset.farewell = "on";
    return () => {
      delete document.documentElement.dataset.farewell;
    };
  }, []);

  useEffect(() => {
    if (stage !== "snuffing") return;
    playSnuff();
    onDarken();
    const timer = window.setTimeout(() => setStage("dark"), prefersReducedMotion() ? 200 : snuffDuration);
    return () => window.clearTimeout(timer);
    // 吹き消すのは段が移ったときの一度だけなので、onDarken は依存に含めない。
  }, [stage]);

  useEffect(() => {
    if (stage === "dark") relightRef.current?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    if (stage !== "parting") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onCancel]);

  const keep = async () => {
    setSaving("busy");
    try {
      const blob = await drawKeepsake(reading, answer);
      if (!blob) throw new Error("no canvas");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = keepsakeFileName(reading);
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSaving("done");
    } catch {
      setSaving("failed");
    }
  };

  return createPortal(
    <div className={`farewell is-${stage}`} role="dialog" aria-modal="true" aria-label={`${oracleName}の見送り`}>
      {stage === "dark" ? (
        <div className="farewell-dark">
          <MoonGlyph age={moon.age} className="farewell-dark-moon" />
          <p>またいつか。月の形が変わったころに。</p>
          <button ref={relightRef} className="text-button farewell-relight" type="button" onClick={onRelight}>もう一度、灯りをともす</button>
        </div>
      ) : (
        <div className="farewell-room">
          <div className="farewell-oracle">
            <OraclePortrait pose="listening" size="small" />
            <div className="farewell-words">
              <p>{parting}</p>
              {stage === "snuffing" ? <p className="farewell-goodnight">{goodnight}</p> : null}
            </div>
          </div>

          <figure className="farewell-letter">
            <MoonGlyph age={moon.age} className="farewell-letter-moon" />
            <figcaption>{answerLabel(askedAt)}</figcaption>
            <blockquote>{answer.trim()}</blockquote>
            <p className="farewell-letter-date">
              {askedAt.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}の{timeBand(askedAt)}・{moon.name}
            </p>
            <span className="farewell-seal" aria-hidden="true">☾</span>
          </figure>

          <div className="farewell-candle" aria-hidden="true">
            <span className="farewell-flame" />
            <span className="farewell-smoke"><i /><i /><i /></span>
            <span className="farewell-wax" />
          </div>

          {stage === "parting" ? (
            <div className="farewell-actions">
              <button className="secondary-button" type="button" disabled={saving === "busy"} onClick={() => void keep()}>
                {saving === "busy" ? "封をしています…" : saving === "done" ? "封書を持ち帰りました" : "封書を持ち帰る"}
              </button>
              <button ref={firstRef} className="primary-button" type="button" onClick={() => setStage("snuffing")}>
                <span aria-hidden="true">✦</span><span>礼を言って、席を立つ</span><span aria-hidden="true">✦</span>
              </button>
              <button className="text-button" type="button" onClick={onCancel}>まだ、卓にいる</button>
              {saving === "failed" ? <p className="copy-fallback" role="status">封書をうまく綴じられませんでした。答えは帳面に残っています。</p> : null}
              {saving === "done" ? <p className="farewell-kept" role="status">今夜の月と答えを、一枚の絵にして保存しました。</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>,
    document.body,
  );
};
