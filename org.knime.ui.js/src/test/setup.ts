import { vi } from "vitest";
import { config } from "@vue/test-utils";
import { Container } from "pixi.js";

import { KANVAS_RENDERER_STORAGE_KEY } from "@/components/workflowEditor/util/canvasRenderer";
import { characterLimits } from "@/plugins/constants";
import { setupLogger } from "@/plugins/logger";

import { lodashMockFactory } from "./utils";

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
  Portal: true,
  PortalTarget: true,
};
config.global.mocks.$characterLimits = characterLimits;

setupLogger();

// mock presence of 'EquoCommService' object
window.EquoCommService = {
  send: (_: any, __: any) => Promise.resolve(),
  on: (_: any, __: any, ___: any) => {},
};

// tests will for now only run when svg is the default
localStorage.setItem(KANVAS_RENDERER_STORAGE_KEY, "SVG");

vi.mock("raf-throttle", () => ({
  default(func: (..._args: any) => any) {
    return function (this: any, ...args: any[]) {
      // eslint-disable-next-line no-invalid-this
      return func.apply(this, args);
    };
  },
}));

vi.mock("lodash-es", async (importActual) => {
  const actual = await importActual();

  return {
    // @ts-expect-error
    ...actual,
    ...lodashMockFactory(),
  };
});

vi.mock("@knime/components", async (importActual) => {
  const actual = await importActual();

  return {
    // @ts-expect-error
    ...actual,
    setupHints: vi.fn(),
    useHint: () => ({ createHint: vi.fn(), isCompleted: vi.fn(() => true) }),
  };
});

vi.mock("@/components/workflowEditor/WebGLKanvas/common/pixiGlobals", () => {
  const mockedCanvas = document.createElement("canvas");

  mockedCanvas.addEventListener = vi.spyOn(
    mockedCanvas,
    "addEventListener",
  ) as any;
  mockedCanvas.removeEventListener = vi.spyOn(
    mockedCanvas,
    "removeEventListener",
  ) as any;
  mockedCanvas.setPointerCapture = vi.spyOn(
    mockedCanvas,
    "setPointerCapture",
  ) as any;
  mockedCanvas.releasePointerCapture = vi.spyOn(
    mockedCanvas,
    "releasePointerCapture",
  ) as any;

  const mainContainer = new Container({ scale: { x: 1, y: 1 } });
  const mockPixiApp = { canvas: mockedCanvas };

  return {
    pixiGlobals: {
      hasApplicationInstance: vi.fn(() => true),
      setApplicationInstance: vi.fn(),
      getApplicationInstance: vi.fn(() => mockPixiApp),
      hasMainContainer: vi.fn(() => true),
      setMainContainer: vi.fn(),
      getMainContainer: vi.fn(() => mainContainer),
      getCanvas: vi.fn(() => mockedCanvas),
      clear: vi.fn(),
    },
  };
});

class MockPointerEvent extends Event {
  clientX = null;
  clientY = null;
  offsetX = null;
  offsetY = null;
  buttons = null;
  public defaultPrevented = false;
  public overrideTarget: EventTarget | null = null;

  constructor(name: string, args: any) {
    super(name, args);
    this.clientX = args?.clientX;
    this.clientY = args?.clientY;
    this.offsetX = args?.offsetX;
    this.offsetY = args?.offsetY;
    this.buttons = args?.buttons ?? 1;
  }

  public get target() {
    return this.overrideTarget ? this.overrideTarget : super.target;
  }
}
window.PointerEvent = MockPointerEvent as any;
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

vi.mock("@/plugins/toasts", () => {
  const show = vi.fn();
  const remove = vi.fn();
  const removeBy = vi.fn();

  return {
    getToastsProvider: () => {
      return { show, remove, removeBy };
    },
  };
});

class MockWorker {}
// @ts-expect-error
window.Worker = MockWorker;

// Mute consola during tests
const noop = () => {};
const methods = ["error", "info", "debug", "log", "trace", "warn"];
methods.forEach((method) => (window.consola[method] = noop));
