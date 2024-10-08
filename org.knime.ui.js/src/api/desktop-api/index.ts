import type { SpaceProviderNS } from "../custom-types";
import { registerEventHandler } from "../json-rpc-client";

import * as desktopAPIMethods from "./desktop-api";

export type DesktopAPIFunctionResultPayload = {
  name: string;
  result: boolean | string | null;
  error?: string | null;
};

export interface DesktopEventHandlers {
  SaveAndCloseProjectsEvent(payload: {
    projectIds: Array<string>;
    params: unknown[];
  }): void | Promise<any>;

  ImportURIEvent(payload: { x: number; y: number }): void;

  SoftwareUpdateProgressEvent(payload: {
    task: string;
    subtask?: string | null;
    status: "Started" | "Fetching" | "Installing" | "Finished";
    progress: number;
  }): void;

  AiAssistantEvent(payload: { chainType: "qa" | "build"; data: {} }): void;

  AiAssistantServerChangedEvent(): void;

  DesktopAPIFunctionResultEvent(payload: DesktopAPIFunctionResultPayload): void;

  SpaceProvidersChangedEvent(
    payload:
      | { result: Record<string, SpaceProviderNS.SpaceProvider> }
      | { error: string },
  ): void;
}

export const desktop = {
  registerEventHandlers: (handlers: DesktopEventHandlers) => {
    Object.entries(handlers).forEach(([eventName, eventHandler]) => {
      registerEventHandler(eventName, eventHandler);
    });
  },
  ...desktopAPIMethods,
};
