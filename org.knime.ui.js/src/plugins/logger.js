export const silentLogger = () => {
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
