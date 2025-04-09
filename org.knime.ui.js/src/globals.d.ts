import { Entries } from "type-fest";

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
}
