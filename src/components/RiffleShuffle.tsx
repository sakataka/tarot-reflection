import { useLayoutEffect, useRef, type CSSProperties } from "react";

// 一回のシャッフルの長さ。効果音（playShuffle）もこの長さに合わせて鳴らす。
export const riffleCycle = 2200;

// 左右の半分から落ちる札の数と、落ちる順。本物のリフルのように、ときどき同じ側から続けて落ちる。
const falls = ["L", "R", "L", "L", "R", "L", "R", "R", "L", "R", "L", "R", "R", "L", "R", "L", "L", "R"] as const;

// 一回の流れ（割合）: 割る → 内側の角を持ち上げる → 交互に落とす → 反らせて落とす（ブリッジ） → 揃える
const splitEnd = 0.12;
const dropStart = 0.2;
const dropEnd = 0.58;
const fallLength = 0.035;
const bridgeStart = 0.66;
const bridgeLandStart = 0.7;
const bridgeLandEnd = 0.84;
const squareAt = 0.9;

const place = (x: number, y: number, turn: number) => `translate(${x}px, ${y}px) rotate(${turn}deg)`;

// 山の厚み。落とし終えるにつれて薄くなる。影の数を揃えておくと、なめらかに移り変わる。
const thick = "1px 1px 0 #0b1222, 2px 2px 0 rgba(201, 164, 92, .35), 3px 3px 0 #0b1222, 4px 4px 0 rgba(201, 164, 92, .3), 6px 9px 16px rgba(0, 0, 0, .55)";
const thin = "0 0 0 #0b1222, 0 0 0 rgba(201, 164, 92, 0), 1px 1px 0 #0b1222, 1px 1px 0 rgba(201, 164, 92, .15), 3px 4px 10px rgba(0, 0, 0, .5)";

type RiffleShuffleProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  disabled: boolean;
  onStop: () => void;
};

// 山を左右に割り、内側の角を持ち上げて交互に落とし、反らせて揃える。手を止めるまで繰り返す。
export const RiffleShuffle = ({ x, y, width, height, scale, disabled, onStop }: RiffleShuffleProps) => {
  const rootRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof root.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const side = width * 0.58;
    const timing: KeyframeAnimationOptions = { duration: riffleCycle, iterations: Infinity, easing: "linear" };
    const animations: Animation[] = [];
    const run = (element: Element | null, keyframes: Keyframe[]) => {
      if (element) animations.push(element.animate(keyframes, timing));
    };

    run(root.querySelector(".riffle-deck"), [
      { opacity: 1, offset: 0 },
      { opacity: 0, offset: 0.03 },
      { opacity: 0, offset: squareAt + 0.03 },
      { opacity: 1, offset: squareAt + 0.05 },
      { opacity: 1, offset: 1 },
    ]);

    for (const [name, direction] of [["left", -1], ["right", 1]] as const) {
      run(root.querySelector(`.riffle-packet.is-${name}`), [
        { transform: place(0, 0, 0), boxShadow: thick, opacity: 1, offset: 0, easing: "cubic-bezier(.3, .1, .2, 1)" },
        { transform: place(direction * side, 5, direction * 6), boxShadow: thick, opacity: 1, offset: splitEnd },
        // 親指で内側の角を持ち上げる。
        { transform: place(direction * side, 2, direction * 10), boxShadow: thick, opacity: 1, offset: dropStart },
        { transform: place(direction * side * 0.94, 4, direction * 8), boxShadow: thin, opacity: 1, offset: dropEnd },
        { transform: place(direction * side * 0.94, 4, direction * 8), boxShadow: thin, opacity: 0, offset: dropEnd + 0.04 },
        { transform: place(0, 0, 0), boxShadow: thick, opacity: 0, offset: 1 },
      ]);
    }

    root.querySelectorAll(".riffle-card").forEach((element, index) => {
      const direction = falls[index] === "L" ? -1 : 1;
      const dropAt = dropStart + (index * (dropEnd - dropStart)) / falls.length;
      const landAt = bridgeLandStart + (index * (bridgeLandEnd - bridgeLandStart)) / falls.length;
      const height = -index * 0.7;
      // 落ちた札は、きれいには揃わない。わずかなずれを残し、最後に揃える。
      const jitterX = direction * (1 + (index % 3));
      const jitterTurn = direction * (0.6 + (index % 4) * 0.4);
      run(element, [
        { transform: place(direction * side, -2, direction * 10), opacity: 0, offset: 0 },
        { transform: place(direction * side, -2, direction * 10), opacity: 0, offset: dropAt - 0.001 },
        { transform: place(direction * side * 0.88, -3, direction * 9), opacity: 1, offset: dropAt, easing: "cubic-bezier(.4, 0, .6, 1)" },
        { transform: place(jitterX, height, jitterTurn), opacity: 1, offset: dropAt + fallLength },
        { transform: place(jitterX, height, jitterTurn), opacity: 1, offset: bridgeStart - 0.02 },
        // ブリッジ：山を反らせて持ち上げ、下から順にパラパラと落とす。
        { transform: place(jitterX * 0.5, height - 12 - (falls.length - index) * 0.5, 0), opacity: 1, offset: bridgeStart },
        { transform: place(jitterX * 0.5, height - 12 - (falls.length - index) * 0.5, 0), opacity: 1, offset: landAt - 0.02 },
        { transform: place(jitterX * 0.3, height, 0), opacity: 1, offset: landAt },
        { transform: place(0, height, 0), opacity: 1, offset: squareAt },
        { transform: place(0, height, 0), opacity: 1, offset: squareAt + 0.04 },
        { transform: place(0, height, 0), opacity: 0, offset: squareAt + 0.06 },
        { transform: place(direction * side, -2, direction * 10), opacity: 0, offset: 1 },
      ]);
    });

    return () => animations.forEach((animation) => animation.cancel());
  }, [width]);

  return (
    <button
      ref={rootRef}
      className="riffle"
      type="button"
      disabled={disabled}
      aria-label="ここでカードを混ぜる手を止める"
      onClick={onStop}
      style={{ left: x, top: y, width, height, transform: `scale(${scale})` } as CSSProperties}
    >
      <span className="riffle-deck" />
      <span className="riffle-packet is-left" />
      <span className="riffle-packet is-right" />
      {falls.map((_, index) => (
        <span className="riffle-card" key={index} style={{ zIndex: index + 3 }} />
      ))}
    </button>
  );
};
