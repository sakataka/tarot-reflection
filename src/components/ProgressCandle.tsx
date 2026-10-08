import type { CSSProperties } from "react";

// 炎の中心の高さ（絵の上端からの割合）。蝋燭が短くなるほど下がる。
const flameAt = [11.5, 36, 57.5];

// 卓の脇の蝋燭。占いが進むほど短くなり、どこまで来たかを番号の代わりに示す。
export const ProgressCandle = ({ step }: { step: number }) => {
  const current = Math.min(Math.max(step, 1), flameAt.length);
  return (
    <span className="progress-candle" style={{ "--flame-y": `${flameAt[current - 1]}%` } as CSSProperties} aria-hidden="true">
      {flameAt.map((_, index) => (
        <img key={index} className={index + 1 === current ? "is-current" : undefined} src={`cards/candle_${index + 1}.webp`} alt="" />
      ))}
      <i className="progress-candle-glow" />
    </span>
  );
};
