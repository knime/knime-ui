import { vi } from "vitest";

/**
 * Helper function to mock the environment (browser or desktop).
 *
 * ```ts
 * // some-test.ts
 * import { isBrowser, isDesktop } from "@/environment";
 *
 * vi.mock("@/environment");
 * mockEnvironment('DESKTOP', { isDesktop, isBrowser })
 * ```
 */
export const mockEnvironment = (
  environment: "BROWSER" | "DESKTOP",
  fns: { isDesktop: () => any; isBrowser: () => any },
) => {
  vi.mocked(fns.isDesktop).mockReturnValue(environment === "DESKTOP");
  vi.mocked(fns.isBrowser).mockReturnValue(environment === "BROWSER");
};
