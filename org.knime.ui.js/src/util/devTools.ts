export const reloadApp = () => (window.location.href = "/");

export const openInspector = async () => {
  const remoteDebuggingPort =
    import.meta.env.KNIME_CEF_REMOTE_DEBUGGING_PORT ?? "8888";
  const remoteDebuggingUrl = `http://localhost:${remoteDebuggingPort}`;
  const response = await fetch(`${remoteDebuggingUrl}/json`);
  const targets = await response.json();
  targets.forEach((target) => {
    if (target.type === "page" && target.title === "KNIME Analytics Platform") {
      window.open(
        `${remoteDebuggingUrl}${target.devtoolsFrontendUrl}`,
        "_blank",
      );
    }
  });
};
