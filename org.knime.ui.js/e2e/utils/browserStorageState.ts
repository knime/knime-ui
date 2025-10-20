type GetBrowserStorageStateArgs = {
  hints: { skipAll?: boolean; completedHints?: string[] };
};

const getBrowserStorageState = (
  { hints }: GetBrowserStorageStateArgs = {
    hints: { skipAll: true },
  },
) => {
  return {
    cookies: [],
    origins: [
      {
        origin: process.env.PLAYWRIGHT_WEBSERVER_URL!, // eslint-disable-line n/no-process-env
        localStorage: [
          { name: "onboarding.hints.user", value: JSON.stringify(hints) },
          { name: "CANVAS_PERF_MODE", value: "true" },
          { name: "KNIME_KANVAS_RENDERER", value: "WebGL" },
          { name: "KNIME_LOG_LEVEL", value: "verbose" },
        ],
      },
    ],
  };
};

export { getBrowserStorageState };
