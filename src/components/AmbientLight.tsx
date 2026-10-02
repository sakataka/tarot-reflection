import { useEffect, useRef } from "react";

type Mote = { x: number; y: number; size: number; speed: number; sway: number; phase: number; glow: number };

const moteCount = 42;

const createMote = (width: number, height: number, anywhere: boolean): Mote => ({
  x: Math.random() * width,
  y: anywhere ? Math.random() * height : height + 10,
  size: .5 + Math.random() * 1.5,
  speed: 4 + Math.random() * 10,
  sway: 6 + Math.random() * 18,
  phase: Math.random() * Math.PI * 2,
  glow: .25 + Math.random() * .55,
});

// 部屋の灯り。手（ポインタ）の近くを蝋燭が照らし、金の塵がゆっくり昇る。
// 触れる画面では灯りが卓の上をゆるやかに漂う。動きを控える設定では描かない。
export const AmbientLight = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let last = performance.now();
    let pointerSeen = false;
    const light = { x: 0, y: 0, tx: 0, ty: 0 };
    let motes: Mote[] = [];

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!motes.length) {
        motes = Array.from({ length: moteCount }, () => createMote(width, height, true));
        light.x = light.tx = width * .5;
        light.y = light.ty = height * .7;
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      if (!pointerSeen) {
        light.tx = width * (.5 + Math.sin(t * .13) * .28);
        light.ty = height * (.62 + Math.sin(t * .21 + 1) * .16);
      }
      light.x += (light.tx - light.x) * Math.min(1, dt * 5);
      light.y += (light.ty - light.y) * Math.min(1, dt * 5);

      context.clearRect(0, 0, width, height);
      // 蝋燭の灯り：ゆらぎながら半径と明るさが変わる。
      const flicker = .82 + Math.sin(t * 7.3) * .06 + Math.sin(t * 13.1 + 2) * .04 + Math.sin(t * 2.1) * .08;
      const radius = Math.max(width, height) * .32 * (.94 + flicker * .08);
      const glow = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
      glow.addColorStop(0, `rgba(255, 196, 120, ${.085 * flicker})`);
      glow.addColorStop(.35, `rgba(240, 170, 90, ${.035 * flicker})`);
      glow.addColorStop(1, "rgba(240, 170, 90, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const mote of motes) {
        mote.y -= mote.speed * dt;
        const x = mote.x + Math.sin(t * .4 + mote.phase) * mote.sway;
        if (mote.y < -10) Object.assign(mote, createMote(width, height, false));
        const distance = Math.hypot(x - light.x, mote.y - light.y);
        const lit = Math.max(0, 1 - distance / (radius * .9));
        const alpha = mote.glow * (.18 + lit * .82) * (.6 + Math.sin(t * 1.7 + mote.phase) * .4);
        context.beginPath();
        context.fillStyle = `rgba(246, 214, 150, ${alpha})`;
        context.arc(x, mote.y, mote.size * (1 + lit * .6), 0, Math.PI * 2);
        context.fill();
      }
    };

    const loop = (now: number) => {
      if (!document.hidden) draw(now);
      frame = requestAnimationFrame(loop);
    };

    const onPointer = (event: PointerEvent) => {
      // 指で触れたところにも灯りを寄せるが、離せばまた漂いはじめる。
      pointerSeen = event.pointerType !== "touch";
      light.tx = event.clientX;
      light.ty = event.clientY;
    };
    const onLeave = () => { pointerSeen = false; };

    resize();
    frame = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas className="ambient-light" ref={canvasRef} aria-hidden="true" />;
};
