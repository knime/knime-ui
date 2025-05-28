import consola, { type LogLevel, LogLevels, type LogType } from "consola";

import { API } from "@/api";

const getLogLevelFromEnv = (): LogLevel => {
  const fromStorage = localStorage.getItem("KNIME_LOG_LEVEL");
  // @ts-expect-error (please add error description)
  const level: LogType =
    fromStorage ?? import.meta.env.VITE_LOG_LEVEL ?? "warn";

  if (!(level in LogLevels)) {
    return LogLevels.warn;
  }

  return LogLevels[level];
};

type GatewayLoggingPayload = {
  sourceLocationHint: string;
  message: string;
};

export const setupLogger = () => {
  const customConsola = consola.create({
    level: getLogLevelFromEnv(),
  });

  consola.info("Injecting global logger");
  const globalObject = typeof global === "object" ? global : window;

  const gatewayConsola = consola.withTag("GatewayLog");
  const logToGateway = (
    payload: GatewayLoggingPayload,
    options: {
      logToConsola?: boolean;
      loglevel?: "error" | "warn" | "info" | "debug";
    } = {},
  ) => {
    const { logToConsola = true, loglevel = "error" } = options;
    if (logToConsola) {
      gatewayConsola[loglevel].raw(payload);
    }
    const { sourceLocationHint, message } = payload;
    API.application.log({
      loglevel,
      logline: `${sourceLocationHint}\t ${message}`,
    });
  };

  // @ts-expect-error (please add error description)
  globalObject.consola = customConsola;
  globalObject.gatewayLogger = logToGateway;
};
