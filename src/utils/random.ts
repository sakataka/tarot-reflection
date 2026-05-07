import type { Orientation } from "../types/tarot";

export type RandomSource = () => number;

export const randomFloat: RandomSource = () => {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / (0xffffffff + 1);
  }

  return Math.random();
};

export const randomInt = (maxExclusive: number, random: RandomSource = randomFloat): number => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive must be a positive integer.");
  }

  return Math.floor(random() * maxExclusive);
};

export const shuffle = <T>(items: readonly T[], random: RandomSource = randomFloat): T[] => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1, random);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export const randomOrientation = (random: RandomSource = randomFloat): Orientation =>
  random() < 0.5 ? "upright" : "reversed";
