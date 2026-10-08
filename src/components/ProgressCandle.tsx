// 卓の脇の蝋燭。占いが進むほど短くなり、どこまで来たかを番号の代わりに示す。
const waxHeights = [24, 16, 9];

export const ProgressCandle = ({ step }: { step: number }) => {
  const wax = waxHeights[Math.min(Math.max(step, 1), waxHeights.length) - 1];
  const top = 36 - wax;
  return (
    <svg className="progress-candle" viewBox="0 0 24 44" aria-hidden="true">
      <g className="progress-candle-flame" style={{ transform: `translateY(${top - 12}px)` }}>
        <ellipse className="progress-candle-glow" cx="12" cy="7" rx="9" ry="10" />
        <path className="progress-candle-fire" d="M12 0.5 C14.6 4.4 15.4 6.8 15 8.6 C14.6 10.6 13.4 11.6 12 11.6 C10.6 11.6 9.4 10.6 9 8.6 C8.6 6.8 9.6 4.4 12 0.5 Z" />
        <path className="progress-candle-core" d="M12 5.5 C13 7.2 13.3 8.4 13.1 9.3 C12.9 10.2 12.5 10.6 12 10.6 C11.5 10.6 11.1 10.2 10.9 9.3 C10.7 8.4 11 7.2 12 5.5 Z" />
      </g>
      <line className="progress-candle-wick" x1="12" x2="12" y1={top - 1.6} y2={top + 0.6} />
      <rect className="progress-candle-wax" x="8" y={top} width="8" height={wax} rx="1.2" />
      <path className="progress-candle-drip" d={`M8.6 ${top + 0.4} q0 ${Math.min(5, wax / 3)} 1.2 ${Math.min(5, wax / 3)} q1 0 1 -${Math.min(3, wax / 4)}`} />
      <path className="progress-candle-dish" d="M3 37.5 h18 q-1.5 3 -9 3 q-7.5 0 -9 -3 Z" />
    </svg>
  );
};
