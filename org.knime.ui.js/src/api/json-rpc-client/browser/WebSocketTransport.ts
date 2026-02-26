import { WebSocketTransport as BaseWebSocketTransport } from "@open-rpc/client-js";
import type { JSONRPCRequestData } from "@open-rpc/client-js/build/Request";

// eslint-disable-next-line no-magic-numbers
const DEFAULT_TIMEOUT = 60 * 1000;

export class WebSocketTransport extends BaseWebSocketTransport {
  public sendData(
    data: JSONRPCRequestData,
    timeout: number | null = DEFAULT_TIMEOUT,
  ): Promise<any> {
    const promise = super.sendData(data, timeout);

    return promise;
  }
}

export default WebSocketTransport;
