// 占う「いま」を言葉にする。月齢と時刻の帯、それから占いの一日の区切り。

const synodicMonth = 29.530588853;
// 2000-01-06 18:14 UTC の新月を起点にする。
const referenceNewMoon = Date.UTC(2000, 0, 6, 18, 14);
const dayMs = 86_400_000;

export type MoonPhase = {
  age: number;
  name: string;
  glyph: string;
  waxing: boolean;
  // 占い師が語りに添える、この月の気配。
  mood: string;
};

const phases: { until: number; name: string; glyph: string; mood: string }[] = [
  { until: 1.5, name: "新月", glyph: "●", mood: "月が姿を隠す夜。何かを始める種を、闇の中にそっと置くとき" },
  { until: 3.5, name: "三日月", glyph: "☽", mood: "細い月が生まれたばかり。小さな願いを口にしてよいとき" },
  { until: 6.5, name: "満ちてゆく月", glyph: "☽", mood: "月が少しずつ満ちていく。育てているものに手をかけるとき" },
  { until: 8.5, name: "上弦の月", glyph: "◐", mood: "半分まで満ちた月。迷いに区切りをつけ、一歩を決めるとき" },
  { until: 12.5, name: "満ちてゆく月", glyph: "◐", mood: "満月へ向かう月。形になりかけたものを整えるとき" },
  { until: 13.5, name: "十三夜", glyph: "◐", mood: "満ちきる少し手前の、欠けを残した美しい月。完璧でなくてよいとき" },
  { until: 14.5, name: "待宵の月", glyph: "○", mood: "明日の満月を待つ宵。答えが熟していくのを待つとき" },
  { until: 15.8, name: "満月", glyph: "○", mood: "月が満ちきる夜。隠れていたものが照らし出され、実りも疲れも見えるとき" },
  { until: 16.8, name: "十六夜", glyph: "○", mood: "満月のあと、ためらうように昇る月。満ちたものを味わい、少しだけ手放しはじめるとき" },
  { until: 21.0, name: "欠けてゆく月", glyph: "◑", mood: "月が欠けていく。抱えすぎたものを下ろしていくとき" },
  { until: 23.0, name: "下弦の月", glyph: "◑", mood: "半分に欠けた月。終わらせること、片づけることを決めるとき" },
  { until: 27.8, name: "有明の月", glyph: "☾", mood: "明け方の空に残る細い月。静かに振り返り、休むとき" },
  { until: synodicMonth + 1, name: "新月前夜", glyph: "☾", mood: "月が消える前の暗い夜。次の始まりの前に、心を空けておくとき" },
];

export const moonPhase = (date: Date): MoonPhase => {
  const age = (((date.getTime() - referenceNewMoon) / dayMs) % synodicMonth + synodicMonth) % synodicMonth;
  const phase = phases.find((item) => age < item.until) ?? phases[0];
  return { age, name: phase.name, glyph: phase.glyph, waxing: age < synodicMonth / 2, mood: phase.mood };
};

const timeBands: { from: number; name: string }[] = [
  { from: 0, name: "真夜中" },
  { from: 2, name: "夜明け前" },
  { from: 5, name: "朝" },
  { from: 10, name: "昼" },
  { from: 15, name: "午後" },
  { from: 17, name: "夕暮れ" },
  { from: 19, name: "夜" },
  { from: 23, name: "真夜中" },
];

export const timeBand = (date: Date) =>
  [...timeBands].reverse().find((band) => date.getHours() >= band.from)?.name ?? "夜";

// 占いの一日は夜明け（4時）で区切る。夜更けの問いは、まだ「今夜」のうちに数える。
const dayBoundaryHour = 4;

export const readingDayKey = (date: Date) => {
  const shifted = new Date(date.getTime() - dayBoundaryHour * 3_600_000);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
};

export const describeMoment = (date: Date) => {
  const moon = moonPhase(date);
  const dateLabel = date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "long" });
  return `${dateLabel}の${timeBand(date)}。月齢${moon.age.toFixed(1)}の${moon.name}（${moon.waxing ? "満ちていく" : "欠けていく"}月）。${moon.mood}。`;
};
