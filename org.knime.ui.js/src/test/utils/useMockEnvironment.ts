import type { App } from "vue";

// Boilerplate for mocking the envirment module in a test-file:
/*
const mockEnvironment = vi.hoisted(
  () => ({}),
) as typeof import("@/environment");

vi.mock("@/environment", async (importOriginal) => {
  Object.assign(mockEnvironment, await importOriginal());
  return mockEnvironment;
});
const { setEnvironment } = useMockEnvironment(mockEnvironment);
*/

/**
 * Helps with mocking the environment module.
 * See source file for copy-paste-able module mock template.
 * @param mockEnvironment The hoisted object holding the environment keys
 * @returns Function used to switch environments
 */
export const useMockEnvironment = (
  mockEnvironment: typeof import("@/environment"),
) => {
  const setEnvironment = (environment: "BROWSER" | "DESKTOP") => {
    // make sure no unmocked, possibly inconsistent, keys are left.
    // rather throw an error on access than stale data
    Object.keys(mockEnvironment).forEach(
      (key) => delete mockEnvironment[key as keyof typeof mockEnvironment],
    );
    // set the values to the desired environment
    Object.assign(mockEnvironment, {
      DynamicEnvRenderer: {},
      environment,
      isDesktop: environment === "DESKTOP",
      isBrowser: environment === "BROWSER",
      getEnv: () => environment,
      initGlobalEnvProperty: (app: App) => {
        app.config.globalProperties.$environment = environment;
      },
    });
  };

  return {
    setEnvironment,
  };
};
