import fs from "node:fs";
import path from "node:path";

import playwright from "playwright";

const WS_URL = "ws://localhost:7000";
const HTTP_URL = "http://localhost:3000/";

const browser = await playwright.chromium.launch({
  args: ["--remote-debugging-port=9222"],
});
const page = await browser.newPage({
  viewport: {
    width: 1920,
    height: 1040,
  },
});

await page.routeWebSocket(WS_URL, (ws) => {
  ws.onMessage((message) => {
    const messageObject = JSON.parse(message);
    const answer = (result) =>
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: messageObject.id,
          result,
        }),
      );

    const answerFromFile = (file) =>
      answer(JSON.parse(fs.readFileSync(file, "utf-8")).result);

    switch (messageObject.method) {
      case "EventService.addEventListener":
        answer(null);
        break;
      case "ApplicationService.getState":
        answerFromFile(
          path.resolve(import.meta.dirname, "fixtures/getState.json"),
        );
        break;
      case "WorkflowService.getWorkflow":
        answerFromFile(
          path.resolve(import.meta.dirname, "fixtures/getWorkflow.json"),
        );
        break;
      default:
        answer({});
    }
  });
});

await page.goto(HTTP_URL);

await page.evaluate("window.localStorage.clear();");
await page.evaluate(
  "window.localStorage.setItem('onboarding.hints.user', '{\"skipAll\":true}');",
);
await page.evaluate(
  "window.localStorage.setItem('KNIME_KANVAS_RENDERER', 'WebGL');",
);
// await page.evaluate("window.localStorage.setItem('KNIME_KANVAS_RENDERER', 'SVG');");

await page.waitForTimeout(1000);

await page.screenshot({ path: "screenshot.png" });

await browser.close();
