import { synodicMonth } from "../utils/moment";

// 月齢から、輝いている部分の輪郭を描く（中心 0,0・半径 r）。外側の半円と、明暗の境の楕円弧でできている。
export const litMoonPath = (age: number, r: number) => {
  const angle = (age / synodicMonth) * Math.PI * 2;
  const waxing = angle < Math.PI;
  const crescent = Math.cos(angle) > 0;
  const rx = Math.abs(Math.cos(angle)) * r;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
  return `M 0 ${-r} A ${r} ${r} 0 0 ${outerSweep} 0 ${r} A ${rx.toFixed(3)} ${r} 0 0 ${innerSweep} 0 ${-r} Z`;
};

type MoonGlyphProps = {
  age: number;
  className?: string;
};

// 今夜の月の形。影の側も、地球照のようにうっすら残す。
export const MoonGlyph = ({ age, className }: MoonGlyphProps) => (
  <svg className={className ? `moon-glyph ${className}` : "moon-glyph"} viewBox="-12 -12 24 24" aria-hidden="true">
    <circle r="10" className="moon-glyph-shadow" />
    <path d={litMoonPath(age, 10)} className="moon-glyph-lit" />
  </svg>
);
