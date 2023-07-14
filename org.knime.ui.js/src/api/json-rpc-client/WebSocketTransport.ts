/* eslint-disable class-methods-use-this */
import { WebSocketTransport as BaseWebSocketTransport } from "@open-rpc/client-js";
import { serverEventHandler } from "./server-events";

export class WebSocketTransport extends BaseWebSocketTransport {
  public connect(): Promise<any> {
    this.connection.addEventListener("message", (message) => {
      const { data } = message;
      if (typeof data !== "string") {
        return;
      }

      try {
        const parsed = JSON.parse(data);
        if (parsed.eventType) {
          serverEventHandler(data as string);
        }
      } catch (error) {
        consola.log(data);
      }
    });

    return super.connect();
  }
}
