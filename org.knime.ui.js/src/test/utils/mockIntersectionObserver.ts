import { vi } from "vitest";

type IntersectionObserverMockType = {
  (callback: (...args: any[]) => any): void;
  __trigger__: (isIntersecting: boolean) => void;
};

// @ts-expect-error
export const MockIntersectionObserver: IntersectionObserverMockType =
  function MockIntersectionObserver(this: any, callback) {
    this.callbackRef = callback;
    this.element = null;

    // @ts-expect-error
    MockIntersectionObserver.__trigger__ = (isIntersecting = false) => {
      this.callbackRef([{ isIntersecting }]);
    };

    this.observe = function (element: any) {
      this.element = element;
    };

    const disconnect = vi.fn();
    this.disconnect = disconnect;
  };
