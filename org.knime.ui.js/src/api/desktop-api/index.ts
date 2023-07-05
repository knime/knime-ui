import type { SpaceProvider } from "../custom-types";
import { registerNotificationHandler } from "../json-rpc-client";
import * as desktopAPIMethods from "./desktop-api";

export interface DesktopEventHandlers {
  SaveAndCloseWorkflowsEvent(payload: {
    projectIds: Array<string>;
    params: unknown[];
  }): void;
  ImportURIEvent(payload: { x: number; y: number }): void;
  ProgressEvent(payload: {
    status: "STARTED" | "FINISHED";
    text: string;
  }): void;
  AiAssistantEvent(payload: { chainType: "qa" | "build"; data: {} });
  SpaceProvidersResponseEvent(
    payload: { result: Record<string, SpaceProvider> } | { error: string }
  );
}

export const desktop = {
  registerEventHandlers: (handlers: DesktopEventHandlers) => {
    Object.entries(handlers).forEach(([eventName, eventHandler]) => {
      registerNotificationHandler(eventName, eventHandler);
    });
  },
  ...desktopAPIMethods,
};
