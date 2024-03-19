let interval: number;
const PING_INTERVAL_MS = 30000;

const startHeartbeat = () => {
  interval = self.setInterval(() => {
    postMessage({ type: "PING_COMPLETE", timestamp: new Date() });
  }, PING_INTERVAL_MS);
};

self.addEventListener("message", (event) => {
  if (event.data?.type === "PING_START") {
    startHeartbeat();
  }

  if (event.data?.type === "PING_STOP") {
    clearInterval(interval);
  }
});
