import consola, { LogLevels, type LogLevel, type LogType } from "consola";

const getLogLevelFromEnv = (): LogLevel => {
  const fromStorage = localStorage.getItem("KNIME_LOG_LEVEL");
  const level: LogType =
    fromStorage ?? import.meta.env.VITE_LOG_LEVEL ?? "warn";

  if (!(level in LogLevels)) {
    return LogLevels.warn;
  }

  return LogLevels[level];
};

export const setupLogger = () => {
  const customConsola = consola.create({
    level: getLogLevelFromEnv(),
  });

  consola.info("Injecting global logger");
  const globalObject = typeof global === "object" ? global : window;

  // @ts-expect-error
  globalObject.consola = customConsola;
};
