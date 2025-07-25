import { Entries } from "type-fest";

import type { CustomUIEventDataset } from "./components/workflowEditor/WebGLKanvas/util/interaction";

declare global {
  interface Window {
    EquoCommService: {
      send: (eventName: string, payload: any) => Promise<any>;
      on: (
        eventName: string,
        handler: (notification: any) => any,
        errorHandler: (error: any) => any,
      ) => any;
    };

    store: any;
    router: any;
    toast: any;
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
