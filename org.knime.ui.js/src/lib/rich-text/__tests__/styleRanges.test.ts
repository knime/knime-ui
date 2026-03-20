import { describe, expect, it } from "vitest";

import { applyStyleRanges } from "../styleRanges";

describe("styleRanges util", () => {
  it("handles empty ranges", () => {
    const result = applyStyleRanges([], "foo");
    const expected = {
      isValid: true,
      textRanges: [{ text: "foo" }],
    };
    expect(result).toEqual(expected);
  });

  it("handles empty ranges with empty text", () => {
    const result = applyStyleRanges([], "");
    const expected = {
      isValid: true,
      textRanges: [],
    };
    expect(result).toEqual(expected);
  });

  describe("validation", () => {
    const expected = {
      isValid: false,
      textRanges: [{ text: "foobar" }],
    };

    it("rejects overlapping ranges", () => {
      const result = applyStyleRanges(
        [
          { start: 0, length: 3 },
          { start: 1, length: 2 },
        ],
        "foobar",
      );
      expect(result).toEqual(expected);
    });

    it("rejects negative range start", () => {
      const result = applyStyleRanges(
        [
          { start: -1, length: 1 },
          { start: 2, length: 2 },
        ],
        "foobar",
      );
      expect(result).toEqual(expected);
    });

    it("rejects too large range end", () => {
      const result = applyStyleRanges(
        [
          { start: 0, length: 1 },
          { start: 2, length: 20 },
        ],
        "foobar",
      );
      expect(result).toEqual(expected);
    });

    it("rejects missing range start", () => {
      const result = applyStyleRanges([{ length: 1 }], "foobar");
      expect(result).toEqual(expected);
    });

    it("rejects missing range length", () => {
      const result = applyStyleRanges([{ start: 1 }], "foobar");
      expect(result).toEqual(expected);
    });

    it("rejects empty text when range is present", () => {
      const result = applyStyleRanges([{ start: 0, length: 1 }], "");
      const expected = {
        isValid: false,
        textRanges: [],
      };
      expect(result).toEqual(expected);
    });
  });

  it("applies styles when single range cover text", () => {
    const result = applyStyleRanges(
      [{ start: 0, length: 6, bold: true }],
      "foobar",
    );
    const expected = {
      isValid: true,
      textRanges: [{ bold: true, text: "foobar" }],
    };
    expect(result).toEqual(expected);
  });

  it("applies styles when multiple ranges cover text", () => {
    const result = applyStyleRanges(
      [
        { start: 3, length: 3, italic: true },
        { start: 0, length: 3, bold: true },
      ],
      "foobar",
    );
    const expected = {
      isValid: true,
      textRanges: [
        { bold: true, text: "foo" },
        { italic: true, text: "bar" },
      ],
    };
    expect(result).toEqual(expected);
  });

  it("applies styles when single range does not cover text", () => {
    const result = applyStyleRanges(
      [{ start: 1, length: 3, bold: true }],
      "foobar",
    );
    const expected = {
      isValid: true,
      textRanges: [{ text: "f" }, { bold: true, text: "oob" }, { text: "ar" }],
    };
    expect(result).toEqual(expected);
  });

  it("applies styles when multiple ranges do not cover text", () => {
    const result = applyStyleRanges(
      [
        { start: 4, length: 1, italic: true },
        { start: 1, length: 1, bold: true },
      ],
      "foobar",
    );
    const expected = {
      isValid: true,
      textRanges: [
        { text: "f" },
        { bold: true, text: "o" },
        { text: "ob" },
        { italic: true, text: "a" },
        { text: "r" },
      ],
    };
    expect(result).toEqual(expected);
  });
});
