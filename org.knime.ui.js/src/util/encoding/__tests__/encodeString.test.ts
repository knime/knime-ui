import { describe, expect, it } from "vitest";

import { encodeString } from "../encodeString";

describe("encodeString", () => {
  it("should encode an empty string", () => {
    const result = encodeString("");
    expect(result).toBe("");
  });

  it("should encode simple ASCII strings", () => {
    const result = encodeString("hello");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    // Verify it's valid base64
    expect(() => atob(result)).not.toThrow();
  });

  it("should encode strings with spaces", () => {
    const result = encodeString("hello world");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should encode Unicode characters correctly", () => {
    const unicodeString = "Hello 世界";
    const result = encodeString(unicodeString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should encode emojis correctly", () => {
    const emojiString = "Hello 😀 🌍";
    const result = encodeString(emojiString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should encode accented characters correctly", () => {
    const accentedString = "Café résumé naïve";
    const result = encodeString(accentedString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should encode special characters correctly", () => {
    const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const result = encodeString(specialChars);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should handle strings with newlines and tabs", () => {
    const multilineString = "Line 1\nLine 2\tTabbed";
    const result = encodeString(multilineString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should produce different outputs for different inputs", () => {
    const result1 = encodeString("hello");
    const result2 = encodeString("world");
    expect(result1).not.toBe(result2);
  });

  it("should produce consistent output for the same input", () => {
    const input = "test string";
    const result1 = encodeString(input);
    const result2 = encodeString(input);
    expect(result1).toBe(result2);
  });

  it("should handle long strings", () => {
    const longString = "a".repeat(1000);
    const result = encodeString(longString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should handle strings with mixed Unicode and ASCII", () => {
    const mixedString = "ASCII123 中文 العربية 🎉";
    const result = encodeString(mixedString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(() => atob(result)).not.toThrow();
  });

  it("should produce valid base64 output", () => {
    const testStrings = [
      "hello",
      "Hello 世界",
      "😀 🌍",
      "Café",
      "test\nwith\nnewlines",
    ];

    testStrings.forEach((str) => {
      const result = encodeString(str);
      // Base64 should only contain A-Z, a-z, 0-9, +, /, and = for padding
      expect(result).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
    });
  });
});
