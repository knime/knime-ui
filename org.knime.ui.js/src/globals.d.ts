/* eslint-disable one-var */
import { Entries } from "type-fest";

declare let consola: import("consola").Consola;

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

    Vue: any;
    store: any;
    router: any;
  }

  interface ObjectConstructor {
    entries<T extends object>(o: T): Entries<T>;
  }
}
