/* eslint-disable class-methods-use-this */
import type { JSONRPCRequestData } from "@open-rpc/client-js/build/Request";
import { Transport } from "@open-rpc/client-js/build/transports/Transport";
import { JSONRPCError } from "@open-rpc/client-js";
import { ERR_UNKNOWN } from "@open-rpc/client-js/build/Error";
import { serverEventHandler } from "./server-events";

const JSON_RPC_ACTION_ID = "org.knime.ui.java.jsonrpc";
const JAVA_EVENT_ACTION_ID = "org.knime.ui.java.event";

export class DesktopAPTransport extends Transport {
  public uri: string;

  constructor(uri: string) {
    super();
    this.uri = uri;
  }

  public connect(): Promise<any> {
    window.EquoCommService.on(
      JAVA_EVENT_ACTION_ID,
      (event) => serverEventHandler(event),
      // eslint-disable-next-line no-console
      (error) => console.error(error)
    );

    return Promise.resolve();
  }

  public async sendData(
    data: JSONRPCRequestData,
    timeout: number | null = null
  ): Promise<any> {
    const promise = this.transportRequestManager.addRequest(data, timeout);

    try {
      const result = await window.EquoCommService.send(
        JSON_RPC_ACTION_ID,
        JSON.stringify(this.parseData(data))
      );

      const responseErr = this.transportRequestManager.resolveResponse(
        JSON.stringify(result)
      );
      if (responseErr) {
        return Promise.reject(responseErr);
      }
    } catch (e) {
      const responseErr = new JSONRPCError(e.message, ERR_UNKNOWN, e);

      return Promise.reject(responseErr);
    }
    return promise;
  }

  // eslint-disable-next-line no-empty-function
  public close(): void {}
}
