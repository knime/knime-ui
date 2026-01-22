import { describe, expect, it } from "vitest";

import { addLeadingZero, formatTime, isValidDate } from "../date-time";

describe("time", () => {
  it("correctly formats time from milliseconds", () => {
    const dateString = "Nov 22, 1987, 16:00";
    const date = new Date(dateString).getTime();
    const dateMilliseconds = date / 1000;

    expect(formatTime(dateMilliseconds)).toContain(dateString);
  });

  it("adds 0 if number of is smaller than 10", () => {
    expect(addLeadingZero(5)).toBe("05");
  });
});

describe("date", () => {
  it("checks whether date is valid", () => {
    const date1 = new Date("2025-08-12").toISOString();
    const date2 = "2025/08/12";
    const date3 = "foo bar";

    expect(isValidDate(date1)).toBe(true);
    expect(isValidDate(date2)).toBe(true);
    expect(isValidDate(date3)).toBe(false);
  });
});
