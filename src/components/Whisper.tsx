import { useEffect, useRef } from "react";
import { duckAmbience } from "../utils/ambience";
import { fetchWhisper } from "../utils/whisper";

type WhisperProps = {
  // 声で告げる言葉（札の振り返りと、今夜の答え）。
  text: string;
  // 答えの枠が開いたら、一度だけ囁く。
  play: boolean;
  // 声が出はじめたとき。
  onStart?: () => void;
  // 囁き終えたとき（声が出せなかったときも）に知らせる。
  onDone: () => void;
};

// ヴェスペラの囁きを鳴らすだけの、目に見えない仕掛け。止める・聴き直すといった操作は置かない。
export const Whisper = ({ text, play, onStart, onDone }: WhisperProps) => {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const startRef = useRef(onStart);
  startRef.current = onStart;
  const words = text.trim();

  useEffect(() => {
    if (!play || !words) return;
    let cancelled = false;
    let audio: HTMLAudioElement | null = null;
    const finish = () => {
      duckAmbience(false);
      if (!cancelled) doneRef.current();
    };
    fetchWhisper(words)
      .then(async (url) => {
        if (cancelled) return;
        audio = new Audio(url);
        audio.onended = finish;
        audio.onerror = finish;
        duckAmbience(true);
        await audio.play();
        if (!cancelled) startRef.current?.();
      })
      .catch(finish);
    return () => {
      cancelled = true;
      audio?.pause();
      duckAmbience(false);
    };
  }, [play, words]);

  return null;
};
