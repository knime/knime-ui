/* eslint-disable one-var */

declare let consola: import("consola").Consola;

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
