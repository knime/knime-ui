/* eslint-disable func-style */
/* eslint-disable no-undefined */
import type { App } from "vue";

import DynamicEnvRenderer from "./DynamicEnvRenderer.vue";

export type Environment = "DESKTOP" | "BROWSER";

export const environment: Environment =
  window.EquoCommService === undefined ? "BROWSER" : "DESKTOP";

export const isDesktop = () => environment === "DESKTOP";
export const isBrowser = () => environment === "BROWSER";

export const initGlobalEnvProperty = (app: App) => {
  app.config.globalProperties.$environment = environment;
};

type Handler<R> = () => R;

// exactly one handler provided
type OneMatcher<R> =
  | { DESKTOP: Handler<R>; BROWSER?: never }
  | { BROWSER: Handler<R>; DESKTOP?: never };

// both provided, and MUST return the same R
type BothMatcher<R> = { DESKTOP: Handler<R>; BROWSER: Handler<R> };

/**
 * This helper function is mostly useful to preserve a declarative flow in a context that
 * needs to run conditional logic based on the current environment.
 *
 * @example
 * ```
 * // ----- WITHOUT HELPER ------
 *
 * let someState
 *
 * if (isBrowser()) {
 *   someState = ...
 * } else {
 *   someState = ...
 * }
 *
 * // ----- WITH HELPER ------
 *
 * const someState = runInEnvironment({
 *    BROWSER: () => ...,
 *    DESKTOP: () => ...,
 * })
 * ```
 */

// 1) both matchers → return R (no undefined)
export function runInEnvironment<R>(matcher: BothMatcher<R>): R;

// 2) exactly one matcher → return R | undefined (no promise requirement)
export function runInEnvironment<R>(matcher: OneMatcher<R>): R | undefined;

export function runInEnvironment(matcher: any) {
  const noop = () => Promise.resolve(undefined);

  return (matcher[environment] ?? noop)();
}

export { DynamicEnvRenderer };
