import { vi } from "vitest";

export const setEnvironment = (environment: "BROWSER" | "DESKTOP") => {
  vi.resetModules();
  vi.doMock("@/environment", async () => {
    const actual = await vi.importActual("@/environment");

    return {
      ...actual,
      DynamicEnvRenderer: {},
      environment,
      isDesktop: environment === "DESKTOP",
      isBrowser: environment === "BROWSER",
    };
  });
};
