import { vi } from "vitest";

export const createKeyboardEvent = (
  type: string,
  {
    code = "Space",
    shiftKey = false,
    ctrlKey = false,
    metaKey = false,
    target = document.body,
  }: {
    code?: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    target?: any;
  } = {},
): KeyboardEvent => {
  const event = new KeyboardEvent(type, { code, shiftKey, ctrlKey, metaKey });
  Object.defineProperty(event, "target", { value: target });
  event.preventDefault = vi.fn();
  event.stopPropagation = vi.fn();
  return event;
};

export const createPointerEvent = (
  type: string,
  {
    offsetX = 50,
    offsetY = 50,
    button = 0,
    pointerId = 1,
    target = { hasPointerCapture: vi.fn().mockReturnValue(true) },
    dataset = {},
  }: {
    offsetX?: number;
    offsetY?: number;
    button?: number;
    pointerId?: number;
    target?: any;
    dataset?: any;
  } = {},
): PointerEvent => {
  const event = new PointerEvent(type, { button });
  Object.defineProperty(event, "offsetX", { value: offsetX });
  Object.defineProperty(event, "offsetY", { value: offsetY });
  Object.defineProperty(event, "currentTarget", { value: target });
  Object.defineProperty(event, "dataset", { value: dataset });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  return event;
};

export const createWheelEvent = ({
  deltaX = 0,
  deltaY = 100,
  offsetX = 50,
  offsetY = 50,
  shiftKey = false,
  ctrlKey = false,
  metaKey = false,
}: {
  deltaX?: number;
  deltaY?: number;
  offsetX?: number;
  offsetY?: number;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
} = {}): WheelEvent => {
  const event = new WheelEvent("wheel", {
    deltaX,
    deltaY,
    shiftKey,
    ctrlKey,
    metaKey,
  });
  Object.defineProperty(event, "offsetX", { value: offsetX });
  Object.defineProperty(event, "offsetY", { value: offsetY });
  return event;
};
