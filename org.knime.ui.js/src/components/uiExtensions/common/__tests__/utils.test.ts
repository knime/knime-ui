import { describe, expect, it } from "vitest";

import {
  EMBEDDED_CONTENT_PANEL_ID__BOTTOM,
  EMBEDDED_CONTENT_PANEL_ID__RIGHT,
  isUIExtensionFocused,
} from "../utils";

describe("utils", () => {
  const createElement = (id: string) => {
    const element = document.createElement("div");
    element.id = id;
    element.setAttribute("tabIndex", "0");
    document.body.appendChild(element);

    return element;
  };

  it("should check that a UI Extension has focus", () => {
    // some other element
    const someElement = createElement("some-element");
    const bottomPanel = createElement(EMBEDDED_CONTENT_PANEL_ID__BOTTOM);
    const rightPanel = createElement(EMBEDDED_CONTENT_PANEL_ID__RIGHT);

    someElement.focus();
    expect(document.activeElement).toBe(someElement);
    expect(isUIExtensionFocused()).toBe(false);

    bottomPanel.focus();
    expect(document.activeElement).toBe(bottomPanel);
    expect(isUIExtensionFocused()).toBe(true);

    rightPanel.focus();
    expect(document.activeElement).toBe(rightPanel);
    expect(isUIExtensionFocused()).toBe(true);
  });
});
