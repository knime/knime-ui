import { vi } from "vitest";

export const mockBoundingRect = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  top = 0,
  right = 0,
  bottom = 0,
  left = 0,
}) => {
  const mockFn = vi.fn(() => ({
    x,
    y,
    width,
    height,
    top,
    right,
    bottom,
    left,
    toJSON: () => {},
  }));

  HTMLElement.prototype.getBoundingClientRect = mockFn;
};
