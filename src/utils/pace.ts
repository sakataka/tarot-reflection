// 語りの見せ方。占い師が話す速さで区切りごとに進めるか、届いた言葉をすぐに全部見せるか。

export type NarrationPace = "paced" | "instant";

const storageKey = "tarot-reflection:pace";

export const readStoredPace = (): NarrationPace => {
  try {
    return globalThis.localStorage?.getItem(storageKey) === "instant" ? "instant" : "paced";
  } catch {
    return "paced";
  }
};

export const storePace = (pace: NarrationPace) => {
  try {
    globalThis.localStorage?.setItem(storageKey, pace);
  } catch {
    // 保存できなくても、このタブの中では選んだ見せ方で語る。
  }
};
