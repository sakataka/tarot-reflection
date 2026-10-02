import { useEffect, useRef, useState } from "react";
import { moonIllumination, synodicMonth, type MoonPhase } from "../utils/moment";

type MoonlitSceneProps = {
  moon: MoonPhase;
};

// 庭の絵に描かれた月の位置（画像 1280×854 の中の中心と半径）。
const imageSize = [1280, 854] as const;
const moonCenter = [801 / 1280, 162 / 854] as const;
const moonRadius = 64 / 1280;

const vertexSource = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * .5 + .5;
  gl_Position = vec4(aPos, 0., 1.);
}`;

// 絵を一枚のまま動かす。月を今夜の月相に欠けさせ、水面を揺らし、星を瞬かせ、手の動きに奥行きを返す。
const fragmentSource = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uFocus;
uniform vec2 uPointer;
uniform float uTime;
uniform float uScroll;
uniform float uPhase;
uniform float uLit;
uniform float uReveal;
uniform vec2 uMoon;
uniform float uMoonR;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  // object-fit: cover と同じ切り取り。uFocus の位置を中心に寄せる。
  float canvasAspect = uRes.x / uRes.y;
  float imageAspect = uImg.x / uImg.y;
  vec2 scale = canvasAspect > imageAspect ? vec2(1., imageAspect / canvasAspect) : vec2(canvasAspect / imageAspect, 1.);
  vec2 screen = vec2(vUv.x, 1. - vUv.y);
  float zoom = 1.04 + uScroll * .06 - uReveal * .04;
  vec2 halfView = scale * .5 / zoom;
  vec2 uv = (screen - .5) * scale / zoom + clamp(uFocus, halfView, 1. - halfView);

  // 奥行き：下（手前）ほど大きく動く。
  float depth = mix(.25, 1., smoothstep(.2, .95, uv.y));
  uv += uPointer * vec2(.012, .006) * depth;

  // 水面：遠い湖と手前の池だけを揺らす。
  float lake = smoothstep(.525, .545, uv.y) * (1. - smoothstep(.62, .66, uv.y));
  float pool = smoothstep(.70, .73, uv.y);
  float water = max(lake * .6, pool);
  vec2 ripple = vec2(
    sin(uv.y * 210. + uTime * 1.3 + sin(uv.x * 24. + uTime * .5) * 2.) * .0016,
    sin(uv.x * 60. + uTime * .9) * .0009
  ) * water;
  vec3 color = texture2D(uTex, uv + ripple).rgb;

  // 月を今夜の形に欠けさせる。影の側にも地球照をうっすら残す。
  vec2 m = (uv - uMoon) * vec2(uImg.x / uImg.y, 1.) / (uMoonR * uImg.x / uImg.y);
  float r = length(m);
  if (r < 1.25) {
    float s = sqrt(max(0., 1. - m.y * m.y));
    float edge = cos(uPhase * 6.2831853) * s;
    float lit = uPhase < .5 ? smoothstep(edge - .09, edge + .09, m.x) : 1. - smoothstep(-edge - .09, -edge + .09, m.x);
    float disc = 1. - smoothstep(.97, 1.03, r);
    float shade = mix(.16, 1., lit);
    color = mix(color, color * shade * vec3(.86, .9, 1.08), disc);
  }
  // 月の光の暈と水面の映り込みは、満ちた分だけ明るい。
  float halo = exp(-max(0., r - 1.) * 1.6) * (1. - step(r, 1.));
  color += vec3(.95, .82, .55) * halo * .07 * uLit;
  float column = exp(-pow((uv.x - uMoon.x - .015) / .045, 2.)) * water;
  float luminance = dot(color, vec3(.299, .587, .114));
  color *= 1. - column * smoothstep(.3, .65, luminance) * (1. - uLit) * .55;
  // 月の道に、ときどき光の粒が立つ。
  float glint = step(.985, hash(floor(uv * vec2(260., 90.)) + floor(uTime * 2.2)));
  color += vec3(1., .9, .65) * glint * column * smoothstep(.35, .6, luminance) * .5 * uLit;

  // 空の星を瞬かせる。
  float sky = 1. - smoothstep(.36, .5, uv.y);
  float star = smoothstep(.62, .8, luminance) * sky * step(1.35, r);
  color += color * star * (.5 + .5 * sin(uTime * (1.5 + hash(floor(uv * 400.)) * 2.) + hash(floor(uv * 300.)) * 6.28)) * .55;

  // 夜の色へ寄せ、外側を沈め、粒子を重ねる。
  vec2 v = screen - .5;
  color *= 1. - dot(v * vec2(.9, 1.2), v * vec2(.9, 1.2)) * .9;
  color = mix(color, color * vec3(.82, .88, 1.12), .35);
  color *= mix(.25, 1., uReveal) * (1. - uScroll * .45);
  color += (hash(screen * uRes + fract(uTime) * 91.) - .5) * .035;
  gl_FragColor = vec4(color, 1.);
}`;

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn(gl.getShaderInfoLog(shader));
  return null;
};

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// 導入の風景。WebGL が使えなければ、同じ絵をそのまま置く。
export const MoonlitScene = ({ moon }: MoonlitSceneProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  // 月齢は描画のたびにわずかに進むので、絵を描き直さずに最新の値だけを渡す。
  const moonRef = useRef(moon);
  moonRef.current = moon;

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      res: uniform("uRes"), img: uniform("uImg"), focus: uniform("uFocus"), pointer: uniform("uPointer"),
      time: uniform("uTime"), scroll: uniform("uScroll"), phase: uniform("uPhase"), lit: uniform("uLit"),
      reveal: uniform("uReveal"), moon: uniform("uMoon"), moonR: uniform("uMoonR"),
    };
    gl.uniform2f(u.img, imageSize[0], imageSize[1]);
    gl.uniform2f(u.moon, moonCenter[0], moonCenter[1]);
    gl.uniform1f(u.moonR, moonRadius);

    const texture = gl.createTexture();
    let frame = 0;
    let disposed = false;
    let visible = true;
    const still = prefersReducedMotion();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let start = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(u.res, width, height);
      // 縦長の画面では、月と水面が両方入るよう横の中心を月の側へ寄せる。
      const portrait = canvas.clientWidth / canvas.clientHeight < 1.2;
      gl.uniform2f(u.focus, portrait ? .6 : .52, portrait ? .5 : .44);
    };

    const draw = (now: number) => {
      // 入口の幕が上がるまでは、灯りを点けずに待つ。
      if (document.documentElement.dataset.prelude === "on") start = now;
      const elapsed = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * .05;
      pointer.y += (pointer.ty - pointer.y) * .05;
      const rect = canvas.getBoundingClientRect();
      const scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      gl.uniform1f(u.phase, moonRef.current.age / synodicMonth);
      gl.uniform1f(u.lit, moonIllumination(moonRef.current.age));
      gl.uniform1f(u.time, still ? 2 : elapsed);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.uniform1f(u.scroll, scroll);
      // 灯りが入るように、はじめの数秒で明るくなる。
      gl.uniform1f(u.reveal, still ? 1 : 1 - Math.pow(1 - Math.min(1, elapsed / 2.6), 3));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now: number) => {
      if (disposed) return;
      if (visible && !document.hidden) draw(now);
      frame = requestAnimationFrame(loop);
    };

    const image = new Image();
    image.decoding = "async";
    image.src = "cards/selection_oracle.webp";
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      resize();
      setLive(true);
      if (still) draw(performance.now());
      else frame = requestAnimationFrame(loop);
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onResize = () => {
      resize();
      if (still) draw(performance.now());
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className={live ? "moonlit-scene is-live" : "moonlit-scene"}>
      <img src="cards/selection_oracle.webp" alt="" aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
};
