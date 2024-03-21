import consola, { LogLevel } from "consola";

const getLogLevelFromEnv = (): LogLevel => {
  const level = import.meta.env.VITE_LOG_LEVEL || "warn";
  const levelUppercased = level.charAt(0).toUpperCase().concat(level.slice(1));

  if (!LogLevel[levelUppercased]) {
    return LogLevel.Warn;
  }

  // @ts-expect-error
  return LogLevel[levelUppercased];
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
