import { expect, describe, it } from "vitest";
import { formatTime, addLeadingZero } from "@/util/time";

describe("time", () => {
  it("correctly formats time from milliseconds", () => {
    const date = new Date("Nov 21, 1987, 16:00").getTime();
    const dateMilliseconds = date / 1000;

    expect(formatTime(dateMilliseconds)).toContain("Nov 21, 1987, 16:00");
  });

  it("adds 0 if number of is smaller than 10", () => {
    expect(addLeadingZero(5)).toBe("05");
  });
});
