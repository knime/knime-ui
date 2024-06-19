import type { SpaceProviderNS } from "../custom-types";
import { registerEventHandler } from "../json-rpc-client";
import * as desktopAPIMethods from "./desktop-api";

export interface DesktopEventHandlers {
  SaveAndCloseProjectsEvent(payload: {
    projectIds: Array<string>;
    params: unknown[];
  }): void | Promise<any>;

  ImportURIEvent(payload: { x: number; y: number }): void;

  ProgressEvent(payload: {
    status: "STARTED" | "FINISHED";
    text: string;
  }): void;

  AiAssistantEvent(payload: { chainType: "qa" | "build"; data: {} }): void;

  AiAssistantServerChangedEvent(): void;

  DesktopAPIFunctionResultEvent(payload: {
    name: string;
    result: boolean | string | null;
    error: string | null;
  }): void;

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
