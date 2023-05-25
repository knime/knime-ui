import { vi } from "vitest";

type IntersectionObserverMockType = {
  (callback: (...args: any[]) => any);
  __trigger__: (isIntersecting: boolean) => void;
};

// @ts-ignore
export const MockIntersectionObserver: IntersectionObserverMockType =
  function MockIntersectionObserver(this: any, callback) {
    this.callbackRef = callback;
    this.element = null;

    // @ts-ignore
    MockIntersectionObserver.__trigger__ = (isIntersecting = false) => {
      this.callbackRef([{ isIntersecting }]);
    };

    this.observe = function (element) {
      this.element = element;
    };

    const disconnect = vi.fn();
    this.disconnect = disconnect;
  };
