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
}

export const desktop = {
  registerEventHandlers: (handlers: DesktopEventHandlers) => {
    Object.entries(handlers).forEach(([eventName, eventHandler]) => {
      registerNotificationHandler(eventName, eventHandler);
    });
  },
  ...desktopAPIMethods,
};
