import { engines, type EngineId } from "../utils/engine";
import type { NarrationPace } from "../utils/pace";
import { oracleName } from "../utils/persona";

type SettingsPanelProps = {
  engine: EngineId;
  pace: NarrationPace;
  soundOn: boolean;
  onEngineChange: (engine: EngineId) => void;
  onPaceChange: (pace: NarrationPace) => void;
  onSoundChange: (soundOn: boolean) => void;
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

const SettingGroup = <T extends string | boolean>({ title, options, value, onChange }: {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="guide-section">
    <h2>{title}</h2>
    <div className="setting-options" role="radiogroup" aria-label={title}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          className={option.value === value ? "setting-option is-selected" : "setting-option"}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
        >
          <strong>{option.label}</strong>
          <small>{option.note}</small>
        </button>
      ))}
    </div>
  </div>
);

// 占いの卓の外にある、舞台裏の設定。選んだものはこのブラウザに覚えておく。
export const SettingsPanel = ({ engine, pace, soundOn, onEngineChange, onPaceChange, onSoundChange, onClose, backLabel }: SettingsPanelProps) => (
  <section className="guide-panel settings-panel">
    <div className="catalog-heading">
      <div>
        <p className="ornament-kicker">Settings</p>
        <h1>設定</h1>
        <p>選んだものは、このブラウザに覚えておきます。</p>
      </div>
    </div>

    <SettingGroup
      title={`${oracleName}の言葉を紡ぐAI`}
      options={engines.map((option) => ({ value: option.id, label: `${option.label}（${option.model}）`, note: engineNotes[option.id] }))}
      value={engine}
      onChange={onEngineChange}
    />
    <SettingGroup title="語りの見せ方" options={paceOptions} value={pace} onChange={onPaceChange} />
    <SettingGroup title="効果音" options={soundOptions} value={soundOn} onChange={onSoundChange} />

    <div className="guide-back">
      <button className="secondary-button" type="button" onClick={onClose}>{backLabel}</button>
    </div>
  </section>
);
