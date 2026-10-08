// 「今夜の答え」を、ヴェスペラの声で囁いてもらうかどうか。声はサーバーで作り、ここでは受け取って鳴らすだけ。

const storageKey = "tarot-reflection:whisper";

export const readStoredWhisper = (): boolean => {
  try {
    return globalThis.localStorage?.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
};

export const storeWhisper = (on: boolean) => {
  try {
    globalThis.localStorage?.setItem(storageKey, on ? "on" : "off");
  } catch {
    // 保存できなくても、このタブの中では選んだとおりにする。
  }
};

let availability: Promise<boolean> | null = null;

// サーバーに声の準備（音声合成のトークン）があるか。一度だけ尋ねる。
export const whisperAvailable = () => {
  availability ??= fetch("api/whisper")
    .then((response) => (response.ok ? response.json() : { available: false }))
    .then((payload: { available?: unknown }) => payload.available === true)
    .catch(() => false);
  return availability;
};

const voices = new Map<string, Promise<string>>();

// 囁きの音声を取り寄せ、再生できる URL にする。同じ言葉は一度だけ作る。失敗したら次に押したときに取り直す。
export const fetchWhisper = (text: string) => {
  const key = text.trim();
  let pending = voices.get(key);
  if (!pending) {
    pending = fetch("api/whisper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: key }),
    }).then(async (response) => {
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof payload.error === "string" ? payload.error : "声が届きませんでした。");
      }
      return URL.createObjectURL(await response.blob());
    });
    pending.catch(() => voices.delete(key));
    voices.set(key, pending);
  }
  return pending;
};
