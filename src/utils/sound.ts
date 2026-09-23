// 効果音は外部素材を使わず Web Audio で合成する。初期状態はオフで、ユーザー操作後にだけ鳴らす。

const storageKey = "tarot-reflection:sound";

let context: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = readStoredPreference();

function readStoredPreference() {
  try {
    return globalThis.localStorage?.getItem(storageKey) === "on";
  } catch {
    return false;
  }
}

export const isSoundEnabled = () => enabled;

export const setSoundEnabled = (next: boolean) => {
  enabled = next;
  try {
    globalThis.localStorage?.setItem(storageKey, next ? "on" : "off");
  } catch {
    // 保存できなくても、このタブの中では設定が効く。
  }
  if (next) {
    void getContext()?.resume();
  }
};

const getContext = () => {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }
  context ??= new AudioContext();
  return context;
};

const getNoise = (audio: AudioContext) => {
  if (!noiseBuffer) {
    noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
};

const withAudio = (play: (audio: AudioContext, output: GainNode) => void) => {
  if (!enabled) return;
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  const output = audio.createGain();
  output.gain.value = 0.32;
  output.connect(audio.destination);
  play(audio, output);
};

// 紙が擦れるような短いノイズ。filter の帯域で質感を変える。
const brush = (
  audio: AudioContext,
  output: AudioNode,
  start: number,
  { duration, frequency, q = 0.9, gain = 0.5, sweepTo }: { duration: number; frequency: number; q?: number; gain?: number; sweepTo?: number },
) => {
  const source = audio.createBufferSource();
  source.buffer = getNoise(audio);
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(frequency, start);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.012, duration / 4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(envelope).connect(output);
  source.start(start, Math.random() * 0.5, duration + 0.05);
};

const tone = (
  audio: AudioContext,
  output: AudioNode,
  start: number,
  { frequency, duration, gain, type = "sine" }: { frequency: number; duration: number; gain: number; type?: OscillatorType },
) => {
  const oscillator = audio.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
};

export const playShuffle = () =>
  withAudio((audio, output) => {
    const now = audio.currentTime;
    // リフルシャッフル2回分。後半ほど詰まって速くなる。
    for (const offset of [0, 1.05]) {
      for (let index = 0; index < 22; index += 1) {
        const at = now + offset + 0.72 * Math.pow(index / 22, 0.8);
        brush(audio, output, at, { duration: 0.035, frequency: 2600 + Math.random() * 1400, q: 1.4, gain: 0.22 + Math.random() * 0.12 });
      }
      brush(audio, output, now + offset + 0.78, { duration: 0.16, frequency: 900, sweepTo: 420, gain: 0.4 });
    }
  });

export const playDeal = () =>
  withAudio((audio, output) => {
    const now = audio.currentTime;
    brush(audio, output, now, { duration: 0.9, frequency: 1800, sweepTo: 5200, q: 0.6, gain: 0.16 });
    for (let index = 0; index < 14; index += 1) {
      brush(audio, output, now + index * 0.06, { duration: 0.04, frequency: 3200, q: 1.2, gain: 0.08 });
    }
  });

export const playPick = () =>
  withAudio((audio, output) => {
    const now = audio.currentTime;
    brush(audio, output, now, { duration: 0.09, frequency: 2400, sweepTo: 1200, gain: 0.3 });
    tone(audio, output, now + 0.02, { frequency: 1568, duration: 0.5, gain: 0.05 });
  });

export const playPlace = () =>
  withAudio((audio, output) => {
    const now = audio.currentTime;
    brush(audio, output, now, { duration: 0.12, frequency: 700, sweepTo: 300, gain: 0.35 });
    tone(audio, output, now, { frequency: 120, duration: 0.12, gain: 0.18 });
  });

export const playFlip = () =>
  withAudio((audio, output) => {
    const now = audio.currentTime;
    brush(audio, output, now, { duration: 0.2, frequency: 1200, sweepTo: 4200, q: 0.8, gain: 0.3 });
    brush(audio, output, now + 0.19, { duration: 0.07, frequency: 900, gain: 0.25 });
  });

export const playChime = () =>
  withAudio((audio, output) => {
    const now = audio.currentTime;
    [880, 1318.5, 1760].forEach((frequency, index) => {
      tone(audio, output, now + index * 0.12, { frequency, duration: 2.4 - index * 0.4, gain: 0.07 });
      tone(audio, output, now + index * 0.12, { frequency: frequency * 2.01, duration: 0.8, gain: 0.015 });
    });
  });
