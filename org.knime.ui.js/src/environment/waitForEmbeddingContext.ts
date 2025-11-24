import { type EmbeddingContext, embeddingSDK } from "@knime/hub-features";

export const waitForEmbeddingContext = async (): Promise<EmbeddingContext> => {
  const isProd = import.meta.env.PROD;
  const isDev = import.meta.env.DEV;
  const isE2E = import.meta.env.MODE === "e2e";

  if (isProd && !isE2E) {
    return embeddingSDK.guest.waitForContext();
  }

  const getMockContext = () => {
    // eslint-disable-next-line no-magic-numbers
    const twentyMinutes = 20 * 60 * 1000;

    return {
      wsConnectionUri: import.meta.env.VITE_BROWSER_DEV_WS_URL,
      restApiBaseUrl: import.meta.env.VITE_BROWSER_DEV_HTTP_URL,
      userIdleTimeout: twentyMinutes,
      jobId: "_NOOP_",
    } satisfies EmbeddingContext;
  };

  if (isE2E) {
    const context = getMockContext();
    embeddingSDK.guest.setContext(context);
    return context;
  }

  const isBrowserEmbeddedDevMode =
    import.meta.env.VITE_BROWSER_DEV_MODE_EMBEDDED === "true";

  if (isDev && isBrowserEmbeddedDevMode) {
    // still perform the message exchange for embedded mode
    // but use a local WS url for dev
    const context = await embeddingSDK.guest.waitForContext();

    return {
      ...context,
      wsConnectionUri: import.meta.env.VITE_BROWSER_DEV_WS_URL,
    } satisfies EmbeddingContext;
  }

  return getMockContext();
};
