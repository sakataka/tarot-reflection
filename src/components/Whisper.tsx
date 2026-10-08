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
  // 自分から囁き終えたとき（声が出せなかったときも）に知らせる。
  onDone?: () => void;
};

type State = "idle" | "waiting" | "playing" | "failed";

// 「今夜の答え」をヴェスペラの声で囁く。声の準備がないときは何も出さない。
export const Whisper = ({ text, enabled, prefetch = false, auto = false, onDone }: WhisperProps) => {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayed = useRef(false);
  const playbackRequest = useRef(0);
  const words = text.trim();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finish = () => {
    const done = doneRef.current;
    doneRef.current = undefined;
    done?.();
  };

  useEffect(() => {
    let alive = true;
    void whisperAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => {
    playbackRequest.current += 1;
    audioRef.current?.pause();
    duckAmbience(false);
  }, []);

  useEffect(() => {
    if (available && enabled && prefetch && words) fetchWhisper(words).catch(() => undefined);
  }, [available, enabled, prefetch, words]);

  const play = async () => {
    if (!words) return;
    const request = ++playbackRequest.current;
    setError("");
    setState("waiting");
    try {
      const url = await fetchWhisper(words);
      if (request !== playbackRequest.current) return;
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setState("idle");
        duckAmbience(false);
        finish();
      };
      duckAmbience(true);
      await audio.play();
      if (request !== playbackRequest.current) {
        audio.pause();
        return;
      }
      setState("playing");
    } catch (caught) {
      if (request !== playbackRequest.current) return;
      duckAmbience(false);
      finish();
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
    playbackRequest.current += 1;
    audioRef.current?.pause();
    duckAmbience(false);
    setState("idle");
    finish();
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
