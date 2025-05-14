import { type Application } from "pixi.js";

import { type E2ETestUtils } from "../../src/components/workflowEditor/WebGLKanvas/util/e2eTest";

declare global {
  interface Window {
    __PIXI_APP__: Application;
    __E2E_TEST__: E2ETestUtils;
    __PERF_FPS_MEASUREMENT__?: {
      start: DOMHighResTimeStamp;
      frameCount: number;
      countFrames: () => void;
    };
  }
}

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
