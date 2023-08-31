import { expect, describe, it } from "vitest";
import { formatTime, addLeadingZero } from "@/util/time";

describe("time", () => {
  it("correctly formats time from milliseconds", () => {
    expect(formatTime(1693230480.002202)).toContain("Aug 28, 2023, 15:48");
  });

  it("adds 0 if number of is smaller than 10", () => {
    expect(addLeadingZero(5)).toBe("05");
  });
});
