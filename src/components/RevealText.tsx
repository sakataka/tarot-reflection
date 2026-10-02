import type { CSSProperties } from "react";

type RevealTextProps = {
  // 行ごとの文字列。行は狭い画面でだけ折り返す。
  lines: string[];
  delay?: number;
  stagger?: number;
};

// 一文字ずつ、墨がにじむように浮かび上がる見出し。読み上げには行をまとめた一つの文を渡す。
export const RevealText = ({ lines, delay = 0, stagger = 55 }: RevealTextProps) => {
  let index = 0;
  return (
    <>
      <span className="visually-hidden">{lines.join("")}</span>
      {lines.map((line) => (
        <span className="reveal-line" aria-hidden="true" key={line}>
          {[...line].map((char) => {
            const style = { "--d": `${delay + index++ * stagger}ms` } as CSSProperties;
            return <span className="reveal-char" style={style} key={index}>{char}</span>;
          })}
        </span>
      ))}
    </>
  );
};
