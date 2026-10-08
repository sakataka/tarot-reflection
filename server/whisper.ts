import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { defaultStorePath } from "./readingStore";

// 「今夜の答え」だけを、ヴェスペラの声で囁かせる。音声は Gemini Narration Lab（このMacの音声合成API）で作る。
// トークンが無ければ声は出さず、文字だけで占いを続ける。

export const maxWhisperLength = 200;

const defaultVoice = "Gacrux";
const defaultStyle = "四十代半ばの占い師の女性が、蝋燭の灯りの向こうから、相談者ひとりに向けて囁くように。低く、ゆっくり、間をたっぷり取って。神秘的で、ほんの少し艶をにじませ、最後の言葉は静かに言い切る。";

const settings = () => ({
  base: process.env.NARRATION_API_URL?.replace(/\/+$/, ""),
  token: process.env.NARRATION_API_TOKEN,
  voice: process.env.TAROT_VOICE || defaultVoice,
  style: process.env.TAROT_VOICE_STYLE || defaultStyle,
});

export const whisperAvailable = () => {
  const { base, token } = settings();
  return Boolean(base && token);
};

const cacheDir = () => join(dirname(defaultStorePath()), "whispers");

// 同じ言葉・同じ声なら、作った音声をこのMacに残して使い回す（API側の保存は60日で消えるため）。
const cachePath = (text: string, voice: string, style: string) =>
  join(cacheDir(), `${createHash("sha256").update(`${voice}\n${style}\n${text}`).digest("hex").slice(0, 32)}.mp3`);

export class WhisperError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const createWhisper = async (rawText: string, signal?: AbortSignal): Promise<Uint8Array> => {
  const { base, token, voice, style } = settings();
  if (!base || !token) throw new WhisperError("声の準備がありません。", 503);
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text || text.length > maxWhisperLength) throw new WhisperError("囁く言葉が長すぎます。", 400);

  const path = cachePath(text, voice, style);
  const cached = Bun.file(path);
  if (await cached.exists()) return new Uint8Array(await cached.arrayBuffer());

  // 有料なので、失敗しても自動では作り直さない。
  const response = await fetch(`${base}/speech`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, voice, style, format: "mp3", model: "flash" }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = ((await response.json().catch(() => ({}))) as { error?: unknown }).error;
    const message = response.status === 402 ? "今月の声の予算を使い切りました。" : response.status === 429 ? "声の工房が混み合っています。" : typeof detail === "string" ? detail : "声を作れませんでした。";
    throw new WhisperError(message, response.status === 402 || response.status === 429 ? response.status : 502);
  }
  const audio = new Uint8Array(await response.arrayBuffer());
  await mkdir(cacheDir(), { recursive: true });
  await Bun.write(path, audio);
  return audio;
};
