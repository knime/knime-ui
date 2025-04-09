import { beforeEach, describe, expect, it, vi } from "vitest";

const commServiceMock = {
  send: (_: any, __: any) => Promise.resolve(),
  on: (_: any, __: any, ___: any) => {},
};

describe("environment", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.each([
    ["BROWSER", undefined],
    ["DESKTOP", commServiceMock],
  ])("should detect %s environment", async (env, mock) => {
    // @ts-expect-error We need 'undefined' to be allowed here
    window.EquoCommService = mock;
    const module1 = await import("@/environment");
    expect(module1.environment).toBe(env);
  });

  it("should run code only in BROWSER environment via the `runInEnvironment` helper", async () => {
    // @ts-expect-error We need 'undefined' to be allowed here
    window.EquoCommService = undefined;
    const module1 = await import("@/environment");

    const runBrowser = vi.fn(() => Promise.resolve("some BROWSER result"));
    const runDesktop = vi.fn(() => Promise.resolve("some DESKTOP result"));

    const result = await module1.runInEnvironment({
      DESKTOP: () => runDesktop(),
      BROWSER: () => runBrowser(),
    });

    expect(runBrowser).toHaveBeenCalledOnce();
    expect(runDesktop).not.toHaveBeenCalled();
    expect(result).toBe("some BROWSER result");
  });

  it("should run code only in DESKTOP environment via the `runInEnvironment` helper", async () => {
    window.EquoCommService = commServiceMock;
    const module1 = await import("@/environment");

    const runBrowser = vi.fn(() => Promise.resolve("some BROWSER result"));
    const runDesktop = vi.fn(() => Promise.resolve("some DESKTOP result"));

    const result = await module1.runInEnvironment({
      DESKTOP: () => runDesktop(),
      BROWSER: () => runBrowser(),
    });

    expect(runDesktop).toHaveBeenCalledOnce();
    expect(runBrowser).not.toHaveBeenCalled();
    expect(result).toBe("some DESKTOP result");
  });
});
