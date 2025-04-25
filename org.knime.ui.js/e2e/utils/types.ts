import { type Application } from "pixi.js";

export type WorkflowUndoCommandMock = {
  fn: (
    payload: any,
    data: any,
  ) => {
    response: () => any;
  };
  data: any;
};

export type WorkflowCommandFnMock = (payload: any) => {
  matcher: () => boolean;
  response: () => any;
};

export type MockWebsocketOptions = {
  workflowFixturePath: string;
  workflowUndoCommand?: WorkflowUndoCommandMock;
  workflowCommandFn?: WorkflowCommandFnMock;
};

export type StartApplicationHelperOptions = {
  withMouseCursor?: boolean;
  waitForRender?: boolean;
} & MockWebsocketOptions;

export type CustomWindow = typeof window & {
  __PIXI_APP__: Application;
  __PERF_FPS_MEASUREMENT__?: {
    start: DOMHighResTimeStamp;
    frameCount: number;
    countFrames: () => void;
  };
};
