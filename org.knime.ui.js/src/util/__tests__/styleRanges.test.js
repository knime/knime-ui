import { describe, expect, it } from "vitest";

import { applyStyleRanges } from "../styleRanges";

describe("styleRanges util", () => {
  it("handles empty ranges", () => {
    let result = applyStyleRanges([], "foo");
    let expected = {
      isValid: true,
      textRanges: [{ text: "foo" }],
    };
    expect(result).toEqual(expected);
  });

  it("handles empty ranges with empty text", () => {
    let result = applyStyleRanges([], "");
    let expected = {
      isValid: true,
      textRanges: [],
    };
    expect(result).toEqual(expected);
  });

  describe("validation", () => {
    let expected = {
      isValid: false,
      textRanges: [{ text: "foobar" }],
    };

    it("rejects overlapping ranges", () => {
      let result = applyStyleRanges(
        [
          { start: 0, length: 3 },
          { start: 1, length: 2 },
        ],
        "foobar",
      );
      expect(result).toEqual(expected);
    });

    it("rejects negative range start", () => {
      let result = applyStyleRanges(
        [
          { start: -1, length: 1 },
          { start: 2, length: 2 },
        ],
        "foobar",
      );
      expect(result).toEqual(expected);
    });

    it("rejects too large range end", () => {
      let result = applyStyleRanges(
        [
          { start: 0, length: 1 },
          { start: 2, length: 20 },
        ],
        "foobar",
      );
      expect(result).toEqual(expected);
    });

    it("rejects missing range start", () => {
      let result = applyStyleRanges([{ length: 1 }], "foobar");
      expect(result).toEqual(expected);
    });

    it("rejects missing range length", () => {
      let result = applyStyleRanges([{ start: 1 }], "foobar");
      expect(result).toEqual(expected);
    });

    it("rejects empty text when range is present", () => {
      let result = applyStyleRanges([{ start: 0, length: 1 }], "");
      let expected = {
        isValid: false,
        textRanges: [],
      };
      expect(result).toEqual(expected);
    });
  });

  it("applies styles when single range cover text", () => {
    let result = applyStyleRanges(
      [{ start: 0, length: 6, bold: true }],
      "foobar",
    );
    let expected = {
      isValid: true,
      textRanges: [{ bold: true, text: "foobar" }],
    };
    expect(result).toEqual(expected);
  });

  it("applies styles when multiple ranges cover text", () => {
    let result = applyStyleRanges(
      [
        { start: 3, length: 3, italic: true },
        { start: 0, length: 3, bold: true },
      ],
      "foobar",
    );
    let expected = {
      isValid: true,
      textRanges: [
        { bold: true, text: "foo" },
        { italic: true, text: "bar" },
      ],
    };
    expect(result).toEqual(expected);
  });

  it("applies styles when single range does not cover text", () => {
    let result = applyStyleRanges(
      [{ start: 1, length: 3, bold: true }],
      "foobar",
    );
    let expected = {
      isValid: true,
      textRanges: [{ text: "f" }, { bold: true, text: "oob" }, { text: "ar" }],
    };
    expect(result).toEqual(expected);
  });

  it("applies styles when multiple ranges do not cover text", () => {
    let result = applyStyleRanges(
      [
        { start: 4, length: 1, italic: true },
        { start: 1, length: 1, bold: true },
      ],
      "foobar",
    );
    let expected = {
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
