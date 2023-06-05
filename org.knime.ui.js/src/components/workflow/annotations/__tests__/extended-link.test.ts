import { describe, expect, it } from "vitest";
import { ControlClickLink, LinkRegex } from "../extended-link";

describe("transform-control-utils", () => {
  it("extends tiptap link and blocks openOnClick", () => {
    expect(ControlClickLink.config.openOnClick).toBeFalsy();
  });

  it.each([
    "www.test.de",
    "test.de",
    "https://test.de",
    "https://www.test.de",
    "http://test.de",
    "http://www.test.de",
  ])("matches valid urls", (url) => {
    expect(LinkRegex.test(url)).toBeTruthy();
  });

  it.each([
    "test.d",
    "ftp://test.de",
    "test",
    ".test.de",
    "www.test.dedasdffdsf",
  ])("does not match invalid urls", (url) => {
    expect(LinkRegex.test(url)).toBeFalsy();
  });
});
