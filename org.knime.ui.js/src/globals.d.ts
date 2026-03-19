import type { Environment } from "monaco-editor";
import { Entries } from "type-fest";

import type { CustomUIEventDataset } from "./components/workflowEditor/WebGLKanvas/util/interaction";

declare global {
  interface Window {
    EquoCommService: {
      send: (eventName: string, payload: unknown) => Promise<string>;
      on: (
        eventName: string,
        handler: (notification: string) => unknown,
        errorHandler: (error: unknown) => unknown,
      ) => unknown;
    };

    store: unknown;
    router: unknown;
    toast: unknown;

    MonacoEnvironment?: Environment | undefined;
  }

  interface ObjectConstructor {
    entries<T extends object>(o: T): Entries<T>;
  }

  interface UIEvent {
    dataset?: CustomUIEventDataset;
  }
  interface Touch {
    dataset?: CustomUIEventDataset;
  }
}
