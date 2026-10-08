// 席を立つときに持ち帰る封書。今夜の月と答え、卓に出たカードを一枚の絵（PNG）に綴じる。
// 問いそのものは書かない（人に見せても差し支えないように）。
import { litMoonPath } from "../components/MoonGlyph";
import type { Reading } from "../types/tarot";
import { answerLabel, moonPhase, timeBand } from "./moment";
import { oracleName } from "./persona";
import { tableCards } from "./tarot";

const width = 1080;
const height = 1350;
const serif = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
const latin = '"Cormorant Garamond", Georgia, serif';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

// 日本語を、行の幅に収まるよう一文字ずつ折り返す。行頭に句読点が来ないようにする。
const wrap = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  let line = "";
  for (const char of text.replace(/\s+/g, "")) {
    const next = line + char;
    if (context.measureText(next).width > maxWidth && line && !"、。」』）！？".includes(char)) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const spaced = (context: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) => {
  const total = [...text].reduce((sum, char) => sum + context.measureText(char).width + spacing, -spacing);
  let cursor = x - total / 2;
  for (const char of text) {
    context.fillText(char, cursor + context.measureText(char).width / 2, y);
    cursor += context.measureText(char).width + spacing;
  }
};

export const drawKeepsake = async (reading: Reading, answer: string): Promise<Blob | null> => {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const askedAt = new Date(reading.createdAt);
  const moon = moonPhase(askedAt);

  // 夜の紙と、上から落ちる月明かり。
  const ground = context.createLinearGradient(0, 0, 0, height);
  ground.addColorStop(0, "#111a35");
  ground.addColorStop(0.55, "#0a0f1f");
  ground.addColorStop(1, "#070a14");
  context.fillStyle = ground;
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(width / 2, 250, 10, width / 2, 250, 520);
  glow.addColorStop(0, "rgba(234, 208, 143, 0.20)");
  glow.addColorStop(1, "rgba(234, 208, 143, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  // 金の二重枠。
  context.strokeStyle = "rgba(201, 164, 92, 0.75)";
  context.lineWidth = 2;
  context.strokeRect(44, 44, width - 88, height - 88);
  context.strokeStyle = "rgba(201, 164, 92, 0.32)";
  context.lineWidth = 1;
  context.strokeRect(58, 58, width - 116, height - 116);

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#c9a45c";
  context.font = `500 26px ${latin}`;
  spaced(context, "MOONLIT TAROT", width / 2, 132, 10);

  // 占った夜の月。
  context.save();
  context.translate(width / 2, 262);
  context.shadowColor = "rgba(234, 208, 143, 0.55)";
  context.shadowBlur = 40;
  context.fillStyle = "rgba(150, 160, 200, 0.16)";
  context.beginPath();
  context.arc(0, 0, 74, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#efd9a0";
  context.fill(new Path2D(litMoonPath(moon.age, 74)));
  context.restore();

  context.fillStyle = "#c9a45c";
  context.font = `600 30px ${serif}`;
  spaced(context, `― ${answerLabel(askedAt)} ―`, width / 2, 410, 6);

  // 答え。
  context.fillStyle = "#ead08f";
  context.font = `600 46px ${serif}`;
  const lines = wrap(context, answer.trim(), 820).slice(0, 7);
  const lineHeight = 84;
  const cards = tableCards(reading);
  const textTop = 520;
  lines.forEach((line, index) => context.fillText(line, width / 2, textTop + index * lineHeight));

  // 卓に出たカードを、小さく一列に。
  const images = await Promise.all(cards.map((readingCard) => loadImage(readingCard.card.imagePath)));
  const gap = 14;
  const cardWidth = Math.min(118, (820 - gap * (cards.length - 1)) / cards.length);
  const cardHeight = cardWidth * 1.5;
  const rowWidth = cardWidth * cards.length + gap * (cards.length - 1);
  const rowTop = Math.max(textTop + lines.length * lineHeight + 30, height - 190 - cardHeight - 40);
  images.forEach((image, index) => {
    const x = (width - rowWidth) / 2 + index * (cardWidth + gap);
    context.save();
    context.translate(x + cardWidth / 2, rowTop + cardHeight / 2);
    if (cards[index].orientation === "reversed") context.rotate(Math.PI);
    if (image) context.drawImage(image, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    context.strokeStyle = "rgba(201, 164, 92, 0.6)";
    context.lineWidth = 1.5;
    context.strokeRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
    context.restore();
  });

  const date = askedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  context.fillStyle = "#aaa391";
  context.font = `400 26px ${serif}`;
  spaced(context, `${date}　${timeBand(askedAt)}・${moon.name}`, width / 2, height - 150, 3);
  context.fillStyle = "#c9a45c";
  context.font = `600 28px ${serif}`;
  spaced(context, oracleName, width / 2, height - 104, 14);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
};

export const keepsakeFileName = (reading: Reading) => {
  const date = new Date(reading.createdAt);
  return `moonlit-tarot-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}.png`;
};
