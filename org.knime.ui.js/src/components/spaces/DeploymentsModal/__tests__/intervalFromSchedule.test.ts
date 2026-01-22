import { describe, expect, it } from "vitest";

import { getIntervalFromSchedule } from "../intervalFromSchedule";

const getValidSchedule = () => ({
  startTime: 1693395840,
  delay: 10,
  delayType: "MINUTES",
  filter: {
    times: [
      {
        start: [0, 0],
        end: [23, 59, 59],
      },
    ],
    days: Array.from(Array(31)).map((x, i) => i + 1),
    daysOfWeek: Array.from(Array(7)).map((x, i) => i + 1),
    months: Array.from(Array(12)).map((x, i) => i + 1),
  },
});

describe("intervalFromSchedule", () => {
  it("returns default for missing schedules", () => {
    expect(getIntervalFromSchedule(null)).toBe("-");
    expect(getIntervalFromSchedule({})).toBe("-");
  });

  it("returns intervals schedules with single execution", () => {
    expect(
      getIntervalFromSchedule({
        startTime: 1693228680,
        nextScheduledExecution: 1693474980,
        disabled: false,
        skipIfPreviousJobStillRunning: false,
      }),
    ).toBe("Once");
  });

  it("catches exceptions during interval parsing for unexpected edge cases", () => {
    expect(
      getIntervalFromSchedule({ ...getValidSchedule(), delayType: null }),
    ).toBe("Custom interval");
  });

  describe("parsing delay periods", () => {
    it("returns intervals for daily schedules", () => {
      expect(
        getIntervalFromSchedule({
          startTime: 1693228680,
          delay: 1,
          delayType: "DAYS",
          filter: {
            times: [
              {
                start: [0, 0],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("Daily");
    });

    it("returns intervals for multi-day periods", () => {
      expect(
        getIntervalFromSchedule({
          startTime: 1693228680,
          delay: 3,
          delayType: "DAYS",
          filter: {
            times: [
              {
                start: [0, 0],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("Every 3 days");
    });

    it("returns intervals for hourly schedules", () => {
      expect(
        getIntervalFromSchedule({
          startTime: 1693228680,
          delay: 1,
          delayType: "HOURS",
          filter: {
            times: [
              {
                start: [0, 0],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("Hourly");
    });

    it("returns intervals for multi-hour periods", () => {
      expect(
        getIntervalFromSchedule({
          startTime: 1693228680,
          delay: 3,
          delayType: "HOURS",
          filter: {
            times: [
              {
                start: [0, 0],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("Every 3 hours");
    });

    it("returns intervals for schedules executing every minute", () => {
      expect(
        getIntervalFromSchedule({
          startTime: 1693228680,
          delay: 1,
          delayType: "MINUTES",
          filter: {
            times: [
              {
                start: [0, 0],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("Every minute");
    });

    it("returns intervals for multi-minute periods", () => {
      expect(
        getIntervalFromSchedule({
          startTime: 1693228680,
          delay: 10,
          delayType: "MINUTES",
          filter: {
            times: [
              {
                start: [0, 0],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("Every 10 minutes");
    });
  });

  describe("detecting exceptions", () => {
    it("test valid schedule", () => {
      expect(getIntervalFromSchedule(getValidSchedule())).not.toContain(
        "with exceptions",
      );
    });

    it("identifies multiple time-filter items", () => {
      const validSchedule = getValidSchedule();
      expect(
        getIntervalFromSchedule({
          ...getValidSchedule(),
          filter: {
            ...validSchedule.filter,
            times: [
              {
                start: [0, 0],
                end: [13, 59, 59],
              },
              {
                start: [14, 59, 59],
                end: [23, 59, 59],
              },
            ],
          },
        }),
      ).toContain("with exceptions");
    });

    it("identifies non-standard, single time filters", () => {
      const validSchedule = getValidSchedule();
      expect(
        getIntervalFromSchedule({
          ...getValidSchedule(),
          filter: {
            ...validSchedule.filter,
            times: [
              {
                start: [0, 0],
                end: [13, 59, 59],
              },
            ],
          },
        }),
      ).toContain("with exceptions");
    });

    it("identifies schedules executing less than 7 days a week", () => {
      const validSchedule = getValidSchedule();
      expect(
        getIntervalFromSchedule({
          ...getValidSchedule(),
          filter: {
            ...validSchedule.filter,
            daysOfWeek: Array.from(Array(6)).map((x, i) => i + 1),
          },
        }),
      ).toContain("with exceptions");
    });

    it("identifies schedules executing less than every day in a month", () => {
      const validSchedule = getValidSchedule();
      expect(
        getIntervalFromSchedule({
          ...getValidSchedule(),
          filter: {
            ...validSchedule.filter,
            days: Array.from(Array(30)).map((x, i) => i + 1),
          },
        }),
      ).toContain("with exceptions");
    });

    it("identifies schedules executing 31 days a month, inclusive of day 32 (last)", () => {
      const validSchedule = getValidSchedule();
      expect(
        getIntervalFromSchedule({
          ...getValidSchedule(),
          filter: {
            ...validSchedule.filter,
            days: [...Array.from(Array(30)).map((x, i) => i + 1), 32],
          },
        }),
      ).toContain("with exceptions");
    });

    it("identifies schedules executing less than 12 months a year", () => {
      const validSchedule = getValidSchedule();
      expect(
        getIntervalFromSchedule({
          ...getValidSchedule(),
          filter: {
            ...validSchedule.filter,
            months: Array.from(Array(11)).map((x, i) => i + 1),
          },
        }),
      ).toContain("with exceptions");
    });
  });
});
