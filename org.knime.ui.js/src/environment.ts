/* eslint-disable new-cap */
import type { App } from "vue";

export type Environment = "DESKTOP" | "BROWSER";

export const environment: Environment =
  // eslint-disable-next-line no-undefined
  window.switchToJavaUI === undefined ? "BROWSER" : "DESKTOP";

export const initGlobalEnvProperty = (app: App) => {
  app.config.globalProperties.$environment = environment;
};

type Handler = () => void | Promise<any>;

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

type MatchAll = Partial<Record<Environment, Handler>>;
type MatchAny = Record<"ANY", Handler>;
type Matcher = XOR<MatchAll, MatchAny>;

export const runInEnvironment = (matcher: Matcher) => {
  const noop = () => Promise.resolve();

  if (matcher.ANY) {
    return matcher.ANY();
  }

  return (matcher[environment] ?? noop)();
};
