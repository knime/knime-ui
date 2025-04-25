/* eslint-disable func-style */
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { type Page } from "playwright-core";

import { MockWebsocketOptions } from "./types";

const parseJSONFile = (path: string) =>
  JSON.parse(fs.readFileSync(path, "utf-8"));

function* snapshotIdGenerator() {
  let snapshotId = 0;
  while (true) {
    yield ++snapshotId;
  }
}
const getSnapshotId = (() => {
  const g = snapshotIdGenerator();
  return () => g.next().value;
})();

export const mockWebsocket = async (
  page: Page,
  options: MockWebsocketOptions,
) => {
  const { workflowFixturePath, workflowCommandFn, workflowUndoCommand } =
    options;
  const websocketUrl =
    process.env.VITE_BROWSER_DEV_WS_URL ?? "ws://localhost:7000"; // eslint-disable-line n/no-process-env

  await page.routeWebSocket(websocketUrl, (ws) => {
    ws.onMessage((message) => {
      const messageObject = JSON.parse(message.toString());
      const answer = (result: any) =>
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: messageObject.id,
            result,
          }),
        );

      const answerFromFile = (file: string) =>
        answer(parseJSONFile(file).result);

      switch (messageObject.method) {
        case "EventService.addEventListener": {
          answer(null);
          return;
        }

        case "ApplicationService.getState": {
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              "../fixtures/applicationState.json",
            ),
          );
          return;
        }

        case "WorkflowService.getWorkflow": {
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              `../fixtures/${workflowFixturePath}`,
            ),
          );
          return;
        }

        case "WorkflowService.undoWorkflowCommand": {
          console.log("WorkflowService.undoWorkflowCommand");
          if (!workflowUndoCommand) {
            return;
          }

          const { response } = workflowUndoCommand.fn(
            messageObject,
            workflowUndoCommand.data,
          );
          const id = getSnapshotId();

          console.log("undo wf command", response());

          // resolve command itself
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: messageObject.id,
              result: null,
              snapshotId: id,
            }),
          );

          // send server event associated to this command
          ws.send(
            JSON.stringify({
              ...response(),
              snapshotId: id,
            }),
          );
          return;
        }

        case "WorkflowService.executeWorkflowCommand": {
          if (!workflowCommandFn) {
            return;
          }

          try {
            const { matcher, response } = workflowCommandFn(messageObject);

            if (matcher()) {
              const id = getSnapshotId();

              // resolve command itself
              ws.send(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: messageObject.id,
                  result: null,
                  snapshotId: id,
                }),
              );

              // send server event associated to this command
              ws.send(
                JSON.stringify({
                  ...response(),
                  snapshotId: id,
                }),
              );
            }
          } catch (error) {
            console.error("Failed to handle fixture for workflow command", {
              error,
            });
          }

          return;
        }

        default: {
          console.warn(
            `mockWebsocket.ts: no handling of '${messageObject.method}'`,
          );
          answer({});
        }
      }
    });
  });
};
