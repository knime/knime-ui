import { vi } from "vitest";
import consola, { LogLevel } from "consola";
import { config } from "@vue/test-utils";

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
  Portal: true,
  PortalTarget: true,
  PageBuilder: true,
};
consola.level = LogLevel.Error;

// mock presence of desktop function
window.switchToJavaUI = () => {};

vi.mock("raf-throttle", () => ({
  default(func: (..._args: any) => any) {
    return function (this: any, ...args: any[]) {
      // eslint-disable-next-line no-invalid-this
      return func.apply(this, args);
    };
  },
}));

class MockPointerEvent extends Event {
  clientX = null;
  clientY = null;
  buttons = null;
  constructor(name: string, args: any) {
    super(name, args);
    this.clientX = args?.clientX;
    this.clientY = args?.clientY;
    this.buttons = args?.buttons ?? 1;
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
