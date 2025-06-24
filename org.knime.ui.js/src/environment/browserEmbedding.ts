/* eslint-disable func-style */
/* eslint-disable no-undefined */
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

export type BrowserSessionContext = {
  url: string;
  restApiBaseUrl: string;
  userIdleTimeout: number;
};

/**
 * NOTE: These messages are in-sync with the AP Loader application.
 * Additionally, they cannot change due to backwards compatibility. For example,
 * the AP Loader trying to render an AP for a job-viewing session, if the AP Loader
 * has new values but the ones in AP don't match then embedding in the browser won't work.
 */
const MESSAGES = {
  AWAITING_CONNECTION_INFO: "KNIME_UI__AWAITING_CONNECTION_INFO",
  CONNECTION_INFO: "KNIME_UI__CONNECTION_INFO",
  CONNECTION_FAIL: "KNIME_UI__CONNECTION_FAIL",
  USER_ACTIVITY: "KNIME_UI__USER_ACTIVITY",
};

let __browserSessionContext: Readonly<BrowserSessionContext>;

const setBrowserSessionContext = (value: BrowserSessionContext) => {
  if (__browserSessionContext) {
    consola.warn(
      "Browser embedding:: Cannot set BrowserSessionContext, it is already set",
    );
    return;
  }

  __browserSessionContext = Object.freeze(value);
};

const getBrowserSessionContext = () => {
  if (!__browserSessionContext) {
    consola.warn(
      "Browser embedding:: BrowserSessionContext was accessed before it was set.",
    );
    return undefined;
  }

  return __browserSessionContext;
};

/**
 * Only relevant for tests
 */
export const clearBrowserSessionContext = () => {
  if (import.meta.env.PROD) {
    return;
  }

  // @ts-expect-error should not be called in prod
  __browserSessionContext = undefined;
};

/**
 * Wait for wrapper application to send a message containing some context
 * about the browser session (e.g the WS uri)
 */
const waitForContext = (): Promise<BrowserSessionContext> => {
  const { promise, reject, resolve } =
    createUnwrappedPromise<BrowserSessionContext>();

  const isNonEmbeddedDevMode =
    import.meta.env.DEV &&
    import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED !== "true";

  const isE2EMode = import.meta.env.MODE === "e2e";

  // for dev mode, use provided url directly
  // see .env file for more details
  if (isNonEmbeddedDevMode || isE2EMode) {
    // eslint-disable-next-line no-magic-numbers
    const twentyMinutes = 20 * 60 * 1000;

    const context: BrowserSessionContext = {
      url: import.meta.env.VITE_BROWSER_DEV_WS_URL,
      restApiBaseUrl: "",
      userIdleTimeout: twentyMinutes,
    };

    setBrowserSessionContext(context);
    resolve(context);

    return promise;
  }

  function teardown() {
    // eslint-disable-next-line no-use-before-define
    window.removeEventListener("message", onMessage);
  }

  function onMessage(event: MessageEvent) {
    if (event.data.type !== MESSAGES.CONNECTION_INFO) {
      return;
    }

    const { data } = event as MessageEvent<{
      type: string;
      payload: BrowserSessionContext;
    }>;

    consola.info(
      "Browser embedding:: Received BrowserSessionContext message",
      data,
    );
    const { payload } = data;

    // for embedded dev mode, resolve to the dev urls
    // see .env file for more details
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED === "true"
    ) {
      const context: BrowserSessionContext = {
        url: import.meta.env.VITE_BROWSER_DEV_WS_URL,
        restApiBaseUrl: "",
        userIdleTimeout: payload.userIdleTimeout,
      };
      setBrowserSessionContext(context);
      resolve(context);
      teardown();
      return;
    }

    if (!payload.url) {
      consola.fatal(
        "Browser embedding:: Incorrect BrowserSessionContext payload",
        data,
      );
      reject(new Error("incorrect BrowserSessionContext payload. URL missing"));
      teardown();
      return;
    }

    setBrowserSessionContext(data.payload);
    resolve(data.payload);
    teardown();
  }

  window.addEventListener("message", onMessage, false);

  // send message to parent after listener has been set-up
  consola.info("Browser embedding:: Awaiting connection info");
  window.parent.postMessage({ type: MESSAGES.AWAITING_CONNECTION_INFO }, "*");

  return promise;
};

type UserActivityInfo = {
  idle: boolean;
  lastActive: string;
};

const notifyActivityChange = (userActivityInfo: UserActivityInfo) => {
  consola.info("Browser embedding:: Sending user activity info", {
    payload: userActivityInfo,
  });

  window.parent.postMessage(
    { type: MESSAGES.USER_ACTIVITY, payload: userActivityInfo },
    "*",
  );
};

const sendAppInitializationError = (error: unknown) => {
  window.parent.postMessage({ type: MESSAGES.CONNECTION_FAIL, error }, "*");
};

export const browserEmbedding = {
  waitForContext,
  getBrowserSessionContext,
  sendAppInitializationError,
  notifyActivityChange,
};
