import { describe, expect, it } from "vitest";

import { hashString } from "../hashString";

describe("hashString", () => {
  it("returns an 8-character hex string", () => {
    const result = hashString("test");
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("produces deterministic output for the same input", () => {
    const input = "hello world";
    const result1 = hashString(input);
    const result2 = hashString(input);
    expect(result1).toBe(result2);
  });

  it("produces different output for different inputs", () => {
    const result1 = hashString("hello");
    const result2 = hashString("world");
    expect(result1).not.toBe(result2);
  });

  it("handles empty string", () => {
    const result = hashString("");
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles strings with special characters", () => {
    const result = hashString("!@#$%^&*()_+-=[]{}|;:,.<>?");
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles unicode characters", () => {
    const result = hashString("Hello 世界 🌍");
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles long strings", () => {
    const longString = "a".repeat(10000);
    const result = hashString(longString);
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles strings with newlines and whitespace", () => {
    const result = hashString("line1\nline2\ttab  spaces");
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is case-sensitive", () => {
    const lower = hashString("hello");
    const upper = hashString("HELLO");
    expect(lower).not.toBe(upper);
  });

  it("produces different hashes for similar strings", () => {
    const hash1 = hashString("test1");
    const hash2 = hashString("test2");
    const hash3 = hashString("1test");
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
  });
});
