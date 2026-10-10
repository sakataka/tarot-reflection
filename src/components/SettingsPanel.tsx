import { useEffect, useState } from "react";
import { engines, type EngineId } from "../utils/engine";
import type { NarrationPace } from "../utils/pace";
import { oracleName } from "../utils/persona";
import { whisperAvailable } from "../utils/whisper";

type SettingsPanelProps = {
  engine: EngineId;
  pace: NarrationPace;
  soundOn: boolean;
  ambienceOn: boolean;
  whisperOn: boolean;
  onEngineChange: (engine: EngineId) => void;
  onPaceChange: (pace: NarrationPace) => void;
  onSoundChange: (soundOn: boolean) => void;
  onAmbienceChange: (ambienceOn: boolean) => void;
  onWhisperChange: (whisperOn: boolean) => void;
  onClose: () => void;
  backLabel: string;
};

type Option<T> = { value: T; label: string; note: string };

const engineNotes: Record<EngineId, string> = {
  claude: "書いた端から言葉が届くので、語りが早く始まります。",
  codex: "文章がひとまとまりになってから届きます。",
};

const paceOptions: Option<NarrationPace>[] = [
  { value: "paced", label: "一枚ずつ、間を置いて", note: `${oracleName}が話す速さで言葉を置き、区切りごとにあなたの合図を待ちます。` },
  { value: "instant", label: "すぐに全部", note: "届いた言葉をそのまま表示し、カードもすぐに表へ返します。" },
];

const soundOptions: Option<boolean>[] = [
  { value: true, label: "鳴らす", note: "カードを混ぜる音、めくる音、言葉が届いた合図。" },
  { value: false, label: "鳴らさない", note: "音を立てずに占います。" },
];

const ambienceOptions: Option<boolean>[] = [
  { value: true, label: "流す", note: "低い部屋鳴り、蝋燭の芯がはぜる音、夜は遠くの虫の声。ごく小さく流します。" },
  { value: false, label: "流さない", note: "部屋は静まりかえったまま。" },
];

const whisperOptions = (available: boolean): Option<boolean>[] => [
  { value: true, label: "囁いてもらう", note: available ? `最後に${oracleName}が札を振り返って答えを囁き、言い終えてから文字が浮かびます。` : "声の準備（音声合成のトークン）がまだありません。整うと囁きます。" },
  { value: false, label: "文字だけ", note: "答えは文字だけで受け取ります。" },
];

const SettingGroup = <T extends string | boolean>({ title, titleParts, options, value, onChange }: {
  title: string;
  titleParts?: string[];
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="guide-section">
    <h2>{titleParts ? titleParts.map((part) => <span className="setting-title-part" key={part}>{part}</span>) : title}</h2>
    <div className="setting-options" role="radiogroup" aria-label={title}>
      {options.map((option, index) => (
        <button
          key={String(option.value)}
          className={option.value === value ? "setting-option is-selected" : "setting-option"}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            const offsets: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            const offset = offsets[event.key];
            if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (offset ?? 0) + options.length) % options.length;
            onChange(options[nextIndex].value);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
          }}
        >
          <strong>{option.label}</strong>
          <small>{option.note}</small>
        </button>
      ))}
    </div>
  </div>
);

// 占いの卓の外にある、舞台裏の設定。選んだものはこのブラウザに覚えておく。
export const SettingsPanel = ({ engine, pace, soundOn, ambienceOn, whisperOn, onEngineChange, onPaceChange, onSoundChange, onAmbienceChange, onWhisperChange, onClose, backLabel }: SettingsPanelProps) => {
  const [voiceReady, setVoiceReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void whisperAvailable().then((ok) => alive && setVoiceReady(ok));
    return () => {
      alive = false;
    };
  }, []);
  return (
  <section className="guide-panel settings-panel">
    <div className="catalog-heading">
      <div>
        <p className="ornament-kicker">Backstage</p>
        <h1>設定</h1>
        <p>卓の外の、舞台裏の選択です。選んだ設定は、このブラウザに保存されます。</p>
      </div>
    </div>

    <SettingGroup
      title={`${oracleName}の言葉を紡ぐAI`}
      titleParts={[`${oracleName}の`, "言葉を紡ぐAI"]}
      options={engines.map((option) => ({ value: option.id, label: `${option.label}（${option.model}）`, note: engineNotes[option.id] }))}
      value={engine}
      onChange={onEngineChange}
    />
    <SettingGroup title="語りの見せ方" options={paceOptions} value={pace} onChange={onPaceChange} />
    <SettingGroup title="効果音" options={soundOptions} value={soundOn} onChange={onSoundChange} />
    <SettingGroup title="部屋の音" options={ambienceOptions} value={ambienceOn} onChange={onAmbienceChange} />
    <SettingGroup title="答えの囁き" options={whisperOptions(voiceReady)} value={whisperOn} onChange={onWhisperChange} />

    <div className="guide-back">
      <button className="secondary-button" type="button" onClick={onClose}>{backLabel}</button>
    </div>
  </section>
  );
};
