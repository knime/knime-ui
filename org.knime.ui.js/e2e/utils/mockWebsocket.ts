import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { type Page } from "playwright-core";

export const mockWebsocket = async (
  page: Page,
  workflowJsonFile: string = "getWorkflow.json",
) => {
  const websocketUrl =
    process.env.VITE_BROWSER_DEV_WS_URL ?? "ws://localhost:7000"; // eslint-disable-line n/no-process-env
  await page.routeWebSocket(websocketUrl, (ws: any) => {
    ws.onMessage((message: string) => {
      const messageObject = JSON.parse(message);
      const answer = (result: any) =>
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: messageObject.id,
            result,
          }),
        );

      const answerFromFile = (file: string) =>
        answer(JSON.parse(fs.readFileSync(file, "utf-8")).result);

      switch (messageObject.method) {
        case "EventService.addEventListener":
          answer(null);
          break;
        case "ApplicationService.getState":
          answerFromFile(
            path.resolve(import.meta.dirname, "../fixtures/getState.json"),
          );
          break;
        case "WorkflowService.getWorkflow":
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              `../fixtures/${workflowJsonFile}`,
            ),
          );
          break;
        default:
          answer({});
      }
    });
  });
};
