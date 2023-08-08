import { WebSocketTransport as BaseWebSocketTransport } from "@open-rpc/client-js";
import type { JSONRPCRequestData } from "@open-rpc/client-js/build/Request";

const DEFAULT_TIMEOUT = 5000;

export class WebSocketTransport extends BaseWebSocketTransport {
  private jobId: string;

  constructor(uri: string, jobId: string) {
    super(uri);
    this.jobId = jobId;
  }

  public connect(): Promise<any> {
    const parentConnectPromise = super.connect();

    const handshakePromise = new Promise((resolve, reject) => {
      // immediately resolve for local development, because the jobId is just a
      // local workflow instead of a remote job running in the executor
      if (!this.jobId) {
        consola.log("Handshake not needed. Skipping");
        resolve("Skipping handshake");
        return;
      }

      // setup handler to receive the handshake. This will only fire upon receiving the
      // first message on the WS channel, and then the handler will automatically unregister
      const handshakeResolve = (message) => {
        const { data } = message;
        if (typeof data !== "string") {
          return;
        }

        try {
          const parsed = JSON.parse(data);

          if (this.jobId !== null && parsed.status === "success") {
            this.connection.removeEventListener("message", handshakeResolve);
            resolve("Handshake success");
          }
        } catch (error) {
          this.connection.removeEventListener("message", handshakeResolve);
          reject(new Error("Handshake error"));
        }
      };

      this.connection.addEventListener("message", handshakeResolve);

      // setup the start of the handshake
      // as soon as the connection opens a message will be sent over the WS
      // channel to send the projectId and initiate the handshake
      const handshakeStart = () => {
        this.connection.send(
          JSON.stringify({
            workflowProjectId: this.jobId,
          }),
        );

        // immediately remove the handler since it's not needed after this
        this.connection.removeEventListener("open", handshakeStart);
      };

      this.connection.addEventListener("open", handshakeStart);
    });

    return Promise.all([parentConnectPromise, handshakePromise]);
  }

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
      });

    return promise;
  }
}

export default WebSocketTransport;
