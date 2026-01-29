/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { type Page } from "playwright-core";

import { MockWebsocketOptions } from "./types";

const parseJSONFile = (path: string) =>
  JSON.parse(fs.readFileSync(path, "utf-8"));

export const mockWebsocket = async (
  page: Page,
  options: MockWebsocketOptions,
) => {
  const {
    workflowFixturePath,
    workflowCommandFn,
    workflowUndoCommand,
    componentDescriptionFixturePath,
  } = options;
  const websocketUrl =
    process.env.VITE_BROWSER_DEV_WS_URL ?? "ws://localhost:7000"; // eslint-disable-line n/no-process-env

  await page.routeWebSocket(websocketUrl, (ws) => {
    ws.onMessage((message) => {
      // omit "keep alive" empty messages if we run that long
      if (!message) {
        return;
      }
      const messageObject = JSON.parse(message.toString());
      const answer = (payload: any) =>
        ws.send(
          JSON.stringify({
            ...payload,
            jsonrpc: "2.0",
            id: messageObject.id,
          }),
        );

      const answerFromFile = (file: string) =>
        answer({ result: parseJSONFile(file).result });

      switch (messageObject.method) {
        case "EventService.addEventListener": {
          answer({ result: null });
          return;
        }

        case "ApplicationService.getState": {
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              "../fixtures/ApplicationService/applicationState.json",
            ),
          );
          return;
        }

        case "SpaceService.getSpaceGroups": {
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              "../fixtures/SpaceService/getSpaceGroups.json",
            ),
          );
          return;
        }

        case "WorkflowService.getWorkflow": {
          const isSinglePath = typeof workflowFixturePath === "string";
          const fixtureToUse = isSinglePath
            ? workflowFixturePath
            : workflowFixturePath[messageObject.params.workflowId];

          answerFromFile(
            path.resolve(import.meta.dirname, `../fixtures/${fixtureToUse}`),
          );
          return;
        }

        case "ComponentService.getComponentDescription": {
          if (!componentDescriptionFixturePath) {
            answer({ result: null });
            return;
          }

          answerFromFile(
            path.resolve(
              import.meta.dirname,
              `../fixtures/${componentDescriptionFixturePath}`,
            ),
          );
          return;
        }

        case "WorkflowService.undoWorkflowCommand": {
          if (!workflowUndoCommand) {
            return;
          }

          const { response } = workflowUndoCommand.fn(
            messageObject,
            workflowUndoCommand.data,
          );

          // resolve command itself
          answer({ result: null });

          // send server event associated to this command
          answer(response());
          return;
        }

        case "WorkflowService.executeWorkflowCommand": {
          if (!workflowCommandFn) {
            return;
          }

          try {
            const {
              matcher,
              response,
              commandResult = () => null,
            } = workflowCommandFn(messageObject);

            if (matcher()) {
              // resolve command itself
              answer({ result: commandResult() });

              // send server event associated to this command
              answer(response());
            }
          } catch (error) {
            console.error("Failed to handle fixture for workflow command", {
              error,
            });
          }

          return;
        }

        case "NodeRepositoryService.getNodesGroupedByTags": {
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              "../fixtures/NodeRepositoryService/getNodesGroupedByTags.json",
            ),
          );
          return;
        }

        case "SpaceService.searchComponents": {
          answerFromFile(
            path.resolve(
              import.meta.dirname,
              "../fixtures/SpaceService/searchComponents.json",
            ),
          );
          return;
        }

        default: {
          // this seems to be fine for events like EventService.removeEventListener
          answer({ result: null });
        }
      }
    });
  });
};
