import type { Spread } from "../types/tarot";

type SpreadSelectorProps = {
  spreads: Spread[];
  selectedSpreadId: string;
  onChange: (spreadId: string) => void;
};

export const SpreadSelector = ({ spreads, selectedSpreadId, onChange }: SpreadSelectorProps) => (
  <div className="spread-selector" role="radiogroup" aria-label="スプレッド選択">
    {spreads.map((spread, index) => (
      <button
        className={spread.id === selectedSpreadId ? "spread-option is-selected" : "spread-option"}
        key={spread.id}
        type="button"
        role="radio"
        aria-checked={spread.id === selectedSpreadId}
        tabIndex={spread.id === selectedSpreadId ? 0 : -1}
        onClick={() => onChange(spread.id)}
        onKeyDown={(event) => {
          const offsets: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
          const offset = offsets[event.key];
          if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
          event.preventDefault();
          const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? spreads.length - 1 : (index + (offset ?? 0) + spreads.length) % spreads.length;
          onChange(spreads[nextIndex].id);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
        }}
      >
        <span className="spread-preview" aria-hidden="true">
          {spread.positions.map((position) => (
            <i key={position.id} />
          ))}
        </span>
        <span className="spread-title">
          <strong>{spread.name}</strong>
          {spread.id === "three-card" ? <em>はじめての方に</em> : null}
        </span>
        <small>{spread.description}</small>
      </button>
    ))}
  </div>
);
