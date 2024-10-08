import { describe, expect, it } from "vitest";

/* eslint-disable dot-notation */
/* eslint-disable quote-props */
import connectorPath from "../connectorPath";

describe("Connector Path", () => {
  let sourcePort = {
    x: 38.5,
    y: 7.5,
  };
  let destPort = {
    x: 7.5,
    y: 40.5,
  };

  it("draws a path between table ports", () => {
    let path = connectorPath(
      sourcePort.x,
      sourcePort.y,
      destPort.x,
      destPort.y,
    );

    const expectedPath = "M42.5,7.5 C60.5,7.5 -14.5,40.5 3.5,40.5";
    expect(path).toBe(expectedPath);
  });

  it("draws a path between other ports", () => {
    let path = connectorPath(
      sourcePort.x,
      sourcePort.y,
      destPort.x,
      destPort.y,
    );

    const expectedPath = "M42.5,7.5 C60.5,7.5 -14.5,40.5 3.5,40.5";
    expect(path).toBe(expectedPath);
  });
});
