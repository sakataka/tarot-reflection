// 部屋の気配。低い部屋鳴り、蝋燭の芯がはぜる音、夜は遠くの虫、明け方は遠い鳥。
// 効果音と同じく外部素材を使わず Web Audio で合成し、ごく小さく流し続ける。
import type { RoomHour } from "./moment";
import { getContext } from "./sound";

const storageKey = "tarot-reflection:ambience";
const level = 0.55;
const duckedLevel = 0.18;
const fadeSeconds = 2.5;

export const readStoredAmbience = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
};

export const storeAmbience = (on: boolean) => {
  try {
    globalThis.localStorage?.setItem(storageKey, on ? "on" : "off");
  } catch {
    // 保存できなくても、このタブの中では選んだとおりにする。
  }
};

type Running = {
  master: GainNode;
  stopSources: () => void;
  timers: number[];
};

let running: Running | null = null;
let ducked = false;
let currentHour: RoomHour = "night";

const noiseBuffer = (audio: AudioContext, brown: boolean) => {
  const length = audio.sampleRate * 4;
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[index] = last * 3.5;
    } else {
      data[index] = white;
    }
  }
  return buffer;
};

let whiteNoise: AudioBuffer | null = null;

// 芯がはぜる一瞬。ごく短いノイズを、高めの帯域で。
const crackle = (audio: AudioContext, output: AudioNode) => {
  whiteNoise ??= noiseBuffer(audio, false);
  const pops = Math.random() < 0.25 ? 2 + Math.floor(Math.random() * 2) : 1;
  for (let index = 0; index < pops; index += 1) {
    const start = audio.currentTime + index * (0.03 + Math.random() * 0.05);
    const duration = 0.006 + Math.random() * 0.02;
    const source = audio.createBufferSource();
    source.buffer = whiteNoise;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400 + Math.random() * 2600;
    filter.Q.value = 0.9;
    const envelope = audio.createGain();
    const peak = 0.04 + Math.random() * 0.09;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(envelope).connect(output);
    source.start(start, Math.random() * 3, duration + 0.02);
  }
};

// 遠くの虫。短い鳴きを三、四回まとめて、左右どちらかの奥から。
const cricket = (audio: AudioContext, output: AudioNode, pan: number, pitch: number) => {
  const panner = audio.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(output);
  const pulses = 3 + Math.floor(Math.random() * 2);
  const base = audio.currentTime + 0.02;
  for (let index = 0; index < pulses; index += 1) {
    const start = base + index * 0.048;
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = pitch;
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.012, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.028);
    oscillator.connect(envelope).connect(panner);
    oscillator.start(start);
    oscillator.stop(start + 0.04);
  }
};

// 明け方の遠い鳥。高く上がる短い声を二、三度。
const bird = (audio: AudioContext, output: AudioNode) => {
  const panner = audio.createStereoPanner();
  panner.pan.value = Math.random() * 1.4 - 0.7;
  panner.connect(output);
  const notes = 2 + Math.floor(Math.random() * 2);
  const pitch = 2600 + Math.random() * 900;
  for (let index = 0; index < notes; index += 1) {
    const start = audio.currentTime + 0.02 + index * (0.14 + Math.random() * 0.05);
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.45, start + 0.07);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.1, start + 0.1);
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.006, start + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
    oscillator.connect(envelope).connect(panner);
    oscillator.start(start);
    oscillator.stop(start + 0.13);
  }
};

const targetLevel = () => (ducked ? duckedLevel : level);

// 揺らぎのある間隔で、同じ音を繰り返し鳴らす。
const every = (state: Running, min: number, max: number, play: () => void) => {
  const schedule = () => {
    const timer = window.setTimeout(() => {
      if (running !== state) return;
      if (document.visibilityState === "visible") play();
      schedule();
    }, min + Math.random() * (max - min));
    state.timers.push(timer);
  };
  schedule();
};

export const startAmbience = (hour: RoomHour) => {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  if (running && currentHour === hour) return;
  stopAmbience(0.6);
  currentHour = hour;

  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, audio.currentTime);
  master.gain.exponentialRampToValueAtTime(targetLevel(), audio.currentTime + fadeSeconds);
  master.connect(audio.destination);

  // 低い部屋鳴り。ゆっくり息をするように揺らす。
  const room = audio.createBufferSource();
  room.buffer = noiseBuffer(audio, true);
  room.loop = true;
  const roomFilter = audio.createBiquadFilter();
  roomFilter.type = "lowpass";
  roomFilter.frequency.value = 260;
  const roomGain = audio.createGain();
  roomGain.gain.value = 0.05;
  const breath = audio.createOscillator();
  breath.frequency.value = 0.07;
  const breathDepth = audio.createGain();
  breathDepth.gain.value = 0.015;
  breath.connect(breathDepth).connect(roomGain.gain);
  room.connect(roomFilter).connect(roomGain).connect(master);
  room.start();
  breath.start();

  const state: Running = {
    master,
    timers: [],
    stopSources: () => {
      room.stop();
      breath.stop();
    },
  };
  running = state;

  every(state, 400, 2600, () => crackle(audio, master));
  if (hour === "night" || hour === "dusk") {
    every(state, 900, 1500, () => cricket(audio, master, -0.6, 4300));
    every(state, 1300, 2300, () => cricket(audio, master, 0.5, 4700));
  }
  if (hour === "morning") every(state, 5000, 14000, () => bird(audio, master));
};

export const stopAmbience = (fade = fadeSeconds) => {
  const state = running;
  if (!state) return;
  const audio = getContext();
  if (!audio) return;
  running = null;
  state.timers.forEach((timer) => window.clearTimeout(timer));
  state.master.gain.cancelScheduledValues(audio.currentTime);
  state.master.gain.setValueAtTime(Math.max(0.0001, state.master.gain.value), audio.currentTime);
  state.master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + fade);
  window.setTimeout(() => {
    state.stopSources();
    state.master.disconnect();
  }, fade * 1000 + 100);
};

// 囁きの間は、部屋の音を下げて声を聴かせる。
export const duckAmbience = (on: boolean) => {
  ducked = on;
  if (!running) return;
  const audio = getContext();
  if (!audio) return;
  running.master.gain.cancelScheduledValues(audio.currentTime);
  running.master.gain.setValueAtTime(Math.max(0.0001, running.master.gain.value), audio.currentTime);
  running.master.gain.exponentialRampToValueAtTime(targetLevel(), audio.currentTime + 0.8);
};
