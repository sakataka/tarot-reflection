import type { Ref } from "react";

type LetterPaperProps = {
  value: string;
  maxLength: number;
  rows: number;
  // 画面には見出しを出さず、読み上げにだけ伝える。
  label: string;
  placeholder?: string;
  // 紙の下に小さく添える一言。
  note?: string;
  readOnly?: boolean;
  className?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
};

// 残りがこれを切ったら、紙の余白が少ないことを知らせる。
const marginWarning = 0.9;

// 蝋燭の下で書きつける一枚の便箋。文字数は数えず、余白が尽きかけたときだけ知らせる。
export const LetterPaper = ({ value, maxLength, rows, label, placeholder, note, readOnly, className, textareaRef, onChange }: LetterPaperProps) => {
  const nearlyFull = value.length >= maxLength * marginWarning;
  const full = value.length >= maxLength;
  return (
    <div className={`letter-paper${className ? ` ${className}` : ""}${full ? " is-full" : ""}`}>
      <textarea
        ref={textareaRef}
        value={value}
        maxLength={maxLength}
        rows={rows}
        readOnly={readOnly}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {nearlyFull ? (
        <small className="letter-margin" role="status">{full ? "紙の余白が尽きました。" : "紙の余白が、あと少しです。"}</small>
      ) : note ? (
        <small className="letter-note">{note}</small>
      ) : null}
    </div>
  );
};
