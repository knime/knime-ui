import { vi } from "vitest";

export const mockLodashThrottleAndDebounce = () => {
  vi.mock("lodash-es", async () => {
    const actual = await vi.importActual("lodash-es");

    const throttle = function (func) {
      return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
      };
    };

    const debounce = function (func) {
      return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
      };
    };

    return {
      ...actual,
      throttle,
      debounce,
    };
  });
};
