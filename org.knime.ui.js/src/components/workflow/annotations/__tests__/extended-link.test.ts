import { describe, expect, it } from "vitest";
import { ControlClickLink } from "../extended-link";

describe("transform-control-utils", () => {
  it("extends tiptap link and blocks openOnClick", () => {
    expect(ControlClickLink.config.openOnClick).toBeFalsy();
  });
});
