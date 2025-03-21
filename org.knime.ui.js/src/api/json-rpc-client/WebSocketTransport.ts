import { WebSocketTransport as BaseWebSocketTransport } from "@open-rpc/client-js";
import type { JSONRPCRequestData } from "@open-rpc/client-js/build/Request";

const DEFAULT_TIMEOUT = 20000;

export class WebSocketTransport extends BaseWebSocketTransport {
  public sendData(
    data: JSONRPCRequestData,
    timeout: number | null = DEFAULT_TIMEOUT,
  ): Promise<any> {
    const promise = super.sendData(data, timeout);

    promise
      .then((response) => {
        // log batch requests
        if (Array.isArray(data)) {
          consola.log({
            requests: data.map(({ request }) => request),
            response,
          });

          return;
        }

        // log standard requests
        consola.log({ request: data.request, response });
      })
      .catch((error) => {
        consola.error(error.data);
        throw error;
      });

    return promise;
  }
}

export default WebSocketTransport;
