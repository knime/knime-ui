import { vi } from "vitest";
import consola, { LogLevel } from "consola";
import { config } from "@vue/test-utils";

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
  Portal: true,
  PortalTarget: true,
  PageBuilder: true,
  Teleport: true,
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
