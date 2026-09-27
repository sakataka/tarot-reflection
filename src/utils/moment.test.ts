import { describe, expect, test } from "bun:test";
import { moonPhase, readingDayKey, timeBand } from "./moment";

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
