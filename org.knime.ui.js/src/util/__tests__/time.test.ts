import { describe, expect, it } from "vitest";

import { addLeadingZero, formatTime } from "@/util/time";

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
