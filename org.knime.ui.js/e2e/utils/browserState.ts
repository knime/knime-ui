/* eslint-disable no-process-env */

const getBrowserState = ({ perfMode = true, webGL = true } = {}) => {
  return {
    cookies: [],
    origins: [
      {
        origin: process.env.PLAYWRIGHT_WEBSERVER_URL!,
        localStorage: [
          { name: "onboarding.hints.user", value: '{"skipAll":true}' },
          { name: "CANVAS_PERF_MODE", value: perfMode ? "true" : "false" },
          { name: "KNIME_KANVAS_RENDERER", value: webGL ? "WebGL" : "SVG" },
          { name: "KNIME_LOG_LEVEL", value: "verbose" },
        ],
      },
    ],
  };
};

export { getBrowserState };
