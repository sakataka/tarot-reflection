import { describe, expect, test } from "bun:test";
import { moonIllumination, synodicMonth } from "../utils/moment";
import { litMoonPath } from "./MoonGlyph";

describe("今夜の月の形", () => {
  test("輝きは新月で0、満月で1、半月で半分", () => {
    expect(moonIllumination(0)).toBeCloseTo(0);
    expect(moonIllumination(synodicMonth / 2)).toBeCloseTo(1);
    expect(moonIllumination(synodicMonth / 4)).toBeCloseTo(.5);
  });

  test("満ちていく月は右側、欠けていく月は左側が光る", () => {
    // 外側の半円の向き（sweep）で、光る側が決まる。
    expect(litMoonPath(5, 10)).toContain("A 10 10 0 0 1 0 10");
    expect(litMoonPath(22, 10)).toContain("A 10 10 0 0 0 0 10");
  });

  test("半月では明暗の境がまっすぐになる", () => {
    expect(litMoonPath(synodicMonth / 4, 10)).toContain("A 0.000 10");
  });
});
