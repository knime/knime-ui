import consola, { LogLevel } from "consola";

const silentLogger = () => {
  const noop = function () {
    // In production, we disable all logging by providing a no-op function.
    // In dev mode, this is overwritten, see plugin in internal project.
  };

  const methods = [
    "debug",
    "error",
    "fatal",
    "info",
    "log",
    "ready",
    "silent",
    "start",
    "success",
    "trace",
    "verbose",
    "warn",
  ];

  // @ts-expect-error
  window.consola = methods.reduce((consola, method) => {
    consola[method] = noop;
    return consola;
  }, {});
};

const getLogLevelFromEnv = (): LogLevel => {
  const fromStorage = localStorage.getItem("KNIME_LOG_LEVEL");
  const level = fromStorage ?? import.meta.env.VITE_LOG_LEVEL ?? "warn";
  const levelUppercased = level.charAt(0).toUpperCase().concat(level.slice(1));

  if (!LogLevel[levelUppercased]) {
    return LogLevel.Warn;
  }

  // @ts-expect-error
  return LogLevel[levelUppercased];
};

export const defaultLogger = () => {
  const customConsola = consola.create({
    level: getLogLevelFromEnv(),
  });

  consola.info("Injecting global logger");
  const globalObject = typeof global === "object" ? global : window;

  // @ts-expect-error
  globalObject.consola = customConsola;
};

export const setupLogger = () => {
  if (import.meta.env.DEV) {
    defaultLogger();
  } else {
    silentLogger();
  }
};
