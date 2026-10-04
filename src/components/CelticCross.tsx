import { celticCrossLayout } from "../data/spreads";
import type { Reading } from "../types/tarot";
import { orientationLabel } from "./ReadingTable";

// 配布順の帯に加えて、十字の位置関係も見渡せる。横向きの2枚目にも元の正逆を保つ。
export const CelticCross = ({ reading, revealed }: { reading: Reading; revealed: readonly boolean[] }) => {
  if (reading.spread.id !== "celtic-cross") return null;
  return (
    <details className="celtic-overview">
      <summary>十字の並びを見渡す</summary>
      <p className="celtic-caption">中央にIとII、右は下からVII〜X</p>
      <div className="celtic-map" aria-label="ケルト十字の配置">
        {reading.cards.map((item, index) => (
          <div className={`celtic-map-slot${index === 1 ? " is-crossing" : ""}`} key={item.position.id}
            style={{ left: `${celticCrossLayout[index].x * 20}%`, top: `${celticCrossLayout[index].y * 17}%` }}
            role="img" aria-label={`${index + 1}・${item.position.name}：${revealed[index] ? `${item.card.nameJa}の${orientationLabel[item.orientation]}` : "まだ伏せたまま"}`}>
            {revealed[index] ? <img className={item.orientation === "reversed" ? "is-reversed" : undefined} src={item.card.imagePath} alt="" /> : <span className="celtic-map-back" />}
            <small>{index + 1}</small>
          </div>
        ))}
      </div>
      <ol className="celtic-legend">{reading.cards.map((item) => <li key={item.position.id}>{item.position.name}</li>)}</ol>
    </details>
  );
};
