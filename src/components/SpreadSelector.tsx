import type { Spread } from "../types/tarot";

type SpreadSelectorProps = {
  spreads: Spread[];
  selectedSpreadId: string;
  onChange: (spreadId: string) => void;
};

export const SpreadSelector = ({ spreads, selectedSpreadId, onChange }: SpreadSelectorProps) => (
  <div className="spread-selector" role="radiogroup" aria-label="スプレッド選択">
    {spreads.map((spread) => (
      <button
        className={spread.id === selectedSpreadId ? "spread-option is-selected" : "spread-option"}
        key={spread.id}
        type="button"
        role="radio"
        aria-checked={spread.id === selectedSpreadId}
        onClick={() => onChange(spread.id)}
      >
        <span>{spread.name}</span>
        <small>{spread.description}</small>
      </button>
    ))}
  </div>
);
