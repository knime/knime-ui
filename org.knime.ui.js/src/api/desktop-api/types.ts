export type DesktopAPIFunctionResultPayload = {
  name: string;
  result: boolean | string | null;
  error?: string | null;
};

export interface DesktopEventHandlers {
  SaveAndCloseProjectsEvent(payload: {
    projectIds: Array<string>;
  }): void | Promise<any>;

  ImportURIEvent(payload: { x: number; y: number }): void;

  SoftwareUpdateProgressEvent(payload: {
    task: string;
    subtask?: string | null;
    status: "Started" | "Fetching" | "Installing" | "Finished";
    progress: number;
  }): void;

  AiAssistantEvent(payload: { chainType: "qa" | "build"; data: unknown }): void;

  AiAssistantServerChangedEvent(): void;

  DesktopAPIFunctionResultEvent(payload: DesktopAPIFunctionResultPayload): void;
}
