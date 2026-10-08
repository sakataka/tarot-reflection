import { useEffect, useRef, useState } from "react";
import { oracleName } from "../utils/persona";
import { duckAmbience } from "../utils/ambience";
import { fetchWhisper, whisperAvailable } from "../utils/whisper";

type WhisperProps = {
  text: string;
  // 囁いてもらう設定か。切っていても、押せば聴ける。
  enabled: boolean;
  // 言葉が届き終えたら、先に声を作っておく。
  prefetch?: boolean;
  // 答えの枠が開いたら、一度だけ自分から囁く。
  auto?: boolean;
};

type State = "idle" | "waiting" | "playing" | "failed";

// 「今夜の答え」をヴェスペラの声で囁く。声の準備がないときは何も出さない。
export const Whisper = ({ text, enabled, prefetch = false, auto = false }: WhisperProps) => {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayed = useRef(false);
  const words = text.trim();

  useEffect(() => {
    let alive = true;
    void whisperAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    duckAmbience(false);
  }, []);

  useEffect(() => {
    if (available && enabled && prefetch && words) fetchWhisper(words).catch(() => undefined);
  }, [available, enabled, prefetch, words]);

  const play = async () => {
    if (!words) return;
    setError("");
    setState("waiting");
    try {
      const url = await fetchWhisper(words);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setState("idle");
        duckAmbience(false);
      };
      duckAmbience(true);
      await audio.play();
      setState("playing");
    } catch (caught) {
      duckAmbience(false);
      setState("failed");
      setError(caught instanceof Error && caught.name !== "NotAllowedError" ? caught.message : "");
    }
  };

  useEffect(() => {
    if (!available || !enabled || !auto || !words || autoPlayed.current) return;
    autoPlayed.current = true;
    void play();
    // play は最新の言葉を使うので、依存に含めない。
  }, [available, enabled, auto, words]);

  const stop = () => {
    audioRef.current?.pause();
    duckAmbience(false);
    setState("idle");
  };

  if (!available || !words) return null;

  return (
    <div className={`whisper is-${state}`}>
      {state === "playing" ? (
        <button className="whisper-button" type="button" onClick={stop}>
          <span className="whisper-wave" aria-hidden="true"><i /><i /><i /></span>
          {oracleName}が囁いています
        </button>
      ) : (
        <button className="whisper-button" type="button" disabled={state === "waiting"} onClick={() => void play()}>
          <span className="whisper-wave" aria-hidden="true"><i /><i /><i /></span>
          {state === "waiting" ? "声を待っています…" : autoPlayed.current || state === "failed" ? "もう一度、囁きを聴く" : "囁きを聴く"}
        </button>
      )}
      {state === "failed" && error ? <small className="whisper-note" role="status">{error}言葉は、このまま読めます。</small> : null}
    </div>
  );
};
