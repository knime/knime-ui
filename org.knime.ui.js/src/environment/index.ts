import type { App } from "vue";

import DynamicEnvRenderer from "./DynamicEnvRenderer.vue";

/* eslint-disable new-cap */

export type Environment = "DESKTOP" | "BROWSER";

export const environment: Environment =
  // eslint-disable-next-line no-undefined
  window.EquoCommService === undefined ? "BROWSER" : "DESKTOP";

export const isDesktop = () => environment === "DESKTOP";
export const isBrowser = () => environment === "BROWSER";

export const initGlobalEnvProperty = (app: App) => {
  app.config.globalProperties.$environment = environment;
};

type Handler = () => void | Promise<any>;

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

type Matcher = AtLeastOne<Record<Environment, Handler>>;

export const runInEnvironment = (matcher: Matcher) => {
  // fallback, just in case value is not provided
  const noop = () => Promise.resolve();

  return (matcher[environment] ?? noop)();
};

export { DynamicEnvRenderer };
