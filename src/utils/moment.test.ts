import { describe, expect, test } from "bun:test";
import { answerLabel, lunationOf, moonPhase, readingDayKey, roomHour, timeBand } from "./moment";

describe("moonPhase", () => {
  test("recognises known new and full moons", () => {
    // 2026-09-11 は新月、2026-09-26/27 は満月前後（国立天文台の暦）。
    expect(moonPhase(new Date("2026-09-11T12:00:00+09:00")).name).toMatch(/新月/);
    expect(["満月", "待宵の月", "十六夜"]).toContain(moonPhase(new Date("2026-09-26T21:00:00+09:00")).name);
  });

  test("tells waxing from waning", () => {
    expect(moonPhase(new Date("2026-09-15T21:00:00+09:00")).waxing).toBe(true);
    expect(moonPhase(new Date("2026-10-03T21:00:00+09:00")).waxing).toBe(false);
  });
});

describe("time", () => {
  test("names the time of day", () => {
    expect(timeBand(new Date(2026, 8, 27, 21, 0))).toBe("夜");
    expect(timeBand(new Date(2026, 8, 27, 1, 0))).toBe("真夜中");
    expect(timeBand(new Date(2026, 8, 27, 12, 0))).toBe("昼");
  });

  test("keeps late night questions in the same reading night until dawn", () => {
    expect(readingDayKey(new Date(2026, 8, 28, 3, 30))).toBe("2026-09-27");
    expect(readingDayKey(new Date(2026, 8, 28, 4, 30))).toBe("2026-09-28");
  });
});

describe("room hour", () => {
  test("names the answer after the hour it was asked", () => {
    expect(answerLabel(new Date(2026, 9, 5, 22, 0))).toBe("今夜の答え");
    expect(answerLabel(new Date(2026, 9, 5, 3, 0))).toBe("今夜の答え");
    expect(answerLabel(new Date(2026, 9, 5, 7, 3))).toBe("今朝の答え");
    expect(answerLabel(new Date(2026, 9, 5, 13, 0))).toBe("今日の答え");
  });

  test("tells dusk from night", () => {
    expect(roomHour(new Date(2026, 9, 5, 18, 0))).toBe("dusk");
    expect(roomHour(new Date(2026, 9, 5, 19, 0))).toBe("night");
  });
});

describe("lunation", () => {
  test("groups nights between two new moons", () => {
    // 2026-09-11 の新月から 2026-10-10 ごろの新月まで（平均の月齢で数えるので、半日ほどずれる）。
    const early = lunationOf(new Date("2026-09-13T21:00:00+09:00"));
    const late = lunationOf(new Date("2026-10-08T21:00:00+09:00"));
    expect(late.index).toBe(early.index);
    expect(early.start.getTime()).toBeLessThan(new Date("2026-09-13T00:00:00+09:00").getTime());
    expect(lunationOf(new Date("2026-10-12T21:00:00+09:00")).index).toBe(early.index + 1);
  });
});
