import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

export type EmbeddingContext = {
  jobId: string;
  restApiBaseUrl: string;
};

const _prefix = "KNIME_DATA_APP";

/**
 * NOTE: These messages must be kept in sync with the hub-execution-webapp
 */
const MESSAGES = {
  AWAITING_EMBEDDING_CONTEXT: `${_prefix}__AWAITING_EMBEDDING_CONTEXT`,
  EMBEDDING_CONTEXT: `${_prefix}__EMBEDDING_CONTEXT`,

  INITIALIZATION_FAILED: `${_prefix}__INITIALIZATION_FAILED`,
};

let __embeddingContext: Readonly<EmbeddingContext>;

const setContext = (value: EmbeddingContext) => {
  if (__embeddingContext) {
    consola.warn("Embedding:: Cannot set context, it is already set");
    return;
  }

  __embeddingContext = Object.freeze(value);
};

const getContext = () => {
  if (!__embeddingContext) {
    consola.warn("Embedding:: Context was accessed before it was set.");
    return undefined;
  }

  return __embeddingContext;
};

/**
 * Only relevant for tests
 */
export const clearContext = () => {
  if (import.meta.env.PROD) {
    return;
  }

  // @ts-expect-error should not be called in prod
  __embeddingContext = undefined;
};

/**
 * Wait for wrapper application to send a message containing some context
 * about the session
 */
const waitForContext = (): Promise<EmbeddingContext> => {
  const { promise, reject, resolve } = createUnwrappedPromise<EmbeddingContext>();

  function teardown() {
    window.removeEventListener("message", onMessage);
  }

  function onMessage(event: MessageEvent) {
    if (event.data.type !== MESSAGES.EMBEDDING_CONTEXT) {
      return;
    }

    const { data } = event as MessageEvent<{
      type: string;
      payload: EmbeddingContext;
    }>;

    consola.info("Embedding:: Received context message", data);
    const { payload } = data;

    // // for embedded dev mode, resolve to the dev urls
    // // see .env file for more details
    // if (import.meta.env.DEV && import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED === "true") {
    //   const context: EmbeddingContext = {
    //     url: import.meta.env.VITE_BROWSER_DEV_WS_URL,
    //     restApiBaseUrl: "",
    //     userIdleTimeout: payload.userIdleTimeout,
    //   };
    //   setContext(context);
    //   resolve(context);
    //   teardown();
    //   return;
    // }

    if (!payload.jobId) {
      consola.fatal("Embedding:: Incorrect context payload", data);
      reject(new Error("incorrect context payload. `jobId` missing"));
      teardown();
      return;
    }

    setContext(data.payload);
    resolve(data.payload);
    teardown();
  }

  window.addEventListener("message", onMessage, false);

  // send message to parent after listener has been set-up
  consola.info("Embedding:: Awaiting to receive context");
  window.parent.postMessage({ type: MESSAGES.AWAITING_EMBEDDING_CONTEXT }, "*");

  return promise;
};

const sendAppInitializationError = (error: unknown) => {
  window.parent.postMessage({ type: MESSAGES.INITIALIZATION_FAILED, error }, "*");
};

export const embedding = {
  waitForContext,
  getContext,
  sendAppInitializationError,
};
