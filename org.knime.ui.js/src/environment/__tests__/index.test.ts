import { beforeEach, describe, expect, it, vi } from "vitest";

describe("environment", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.each([
    ["BROWSER", undefined],
    ["DESKTOP", () => {}],
  ])("should detect %s environment", async (env, desktopFn) => {
    window.switchToJavaUI = desktopFn;
    const module1 = await import("@/environment");
    expect(module1.environment).toBe(env);
  });

  it("should run code only in BROWSER environment via the `runInEnvironment` helper", async () => {
    window.switchToJavaUI = undefined;
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
    window.switchToJavaUI = () => {};
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
