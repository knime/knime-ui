import consola, { LogLevel } from "consola";

export const level = import.meta.env.VITE_LOG_LEVEL || "warn";

const silentLogger = () => {
  const noop = function () {
    // In production, we disable all logging by providing a no-op function.
    // In dev mode, this is overwritten, see plugin in internal project.
  };

  let methods = [
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

  window.consola = methods.reduce((consola, method) => {
    consola[method] = noop;
    return consola;
  }, {});
};

export const defaultLogger = () => {
  const levelUppercased = level.charAt(0).toUpperCase().concat(level.slice(1));
  const customConsola = consola.create({
    level: LogLevel[levelUppercased],
  });

  consola.info("Injecting global logger");
  const globalObject = typeof global === "object" ? global : window;
  globalObject.consola = customConsola;
};

export const setupLogger = () => {
  if (import.meta.env.DEV) {
    defaultLogger();
  } else {
    silentLogger();
  }
};
