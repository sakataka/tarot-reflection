import { oracleName } from "../utils/persona";

type OraclePortraitProps = {
  // listening: 問いに耳を傾けている / reading: 伏せたカードに手をかざしている
  pose: "listening" | "reading";
  size?: "large" | "small";
};

// 卓の向かいに座る占い師の姿。蝋燭の灯りがゆっくり揺れる。
export const OraclePortrait = ({ pose, size = "large" }: OraclePortraitProps) => (
  <span className={`oracle-portrait is-${pose} is-${size}`}>
    <img
      src={`cards/vespera_${pose}.webp`}
      alt={pose === "listening" ? `あなたの問いに耳を傾ける${oracleName}` : `伏せたカードに手をかざす${oracleName}`}
    />
    <span className="oracle-portrait-flame" aria-hidden="true" />
  </span>
);
