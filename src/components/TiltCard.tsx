import { useRef, type ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

// 表になったカードを手に取ったように、ポインタの位置へ少し傾け、箔に灯りを走らせる。
// 指で触れる画面と、動きを控える設定では傾けない。
export const TiltCard = ({ children, className }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const update = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const element = ref.current;
      if (!element) return;
      element.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
      element.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
      element.style.setProperty("--mx", `${((x + 1) * 50).toFixed(1)}%`);
      element.style.setProperty("--my", `${((y + 1) * 50).toFixed(1)}%`);
    });
  };

  return (
    <div
      className={className ? `tilt-card ${className}` : "tilt-card"}
      ref={ref}
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.classList.add("is-tilting");
        update(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.classList.remove("is-tilting");
        update(0, 0);
      }}
    >
      {children}
      <span className="tilt-sheen" aria-hidden="true" />
    </div>
  );
};
