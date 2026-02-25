/* eslint-disable class-methods-use-this */
import { JSONRPCError } from "@open-rpc/client-js";
import { ERR_UNKNOWN } from "@open-rpc/client-js/build/Error";
import type { JSONRPCRequestData } from "@open-rpc/client-js/build/Request";
import { Transport } from "@open-rpc/client-js/build/transports/Transport";

export class DesktopAPTransport extends Transport {
  private rpcActionId: string;

  constructor(rpcActionId: string) {
    super();
    this.rpcActionId = rpcActionId;
  }

  public connect(): Promise<any> {
    return Promise.resolve();
  }

  public async sendData(
    data: JSONRPCRequestData,
    timeout: number | null = null,
  ): Promise<any> {
    const promise = this.transportRequestManager.addRequest(data, timeout);

    try {
      const result = await window.EquoCommService.send(
        this.rpcActionId,
        JSON.stringify(this.parseData(data)),
      );

      const responseErr = this.transportRequestManager.resolveResponse(result);

      if (responseErr) {
        return Promise.reject(responseErr);
      }
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error.message as string)
          : "";

      const responseErr = new JSONRPCError(message, ERR_UNKNOWN, error);

      return Promise.reject(responseErr);
    }
    return promise;
  }

  // eslint-disable-next-line no-empty-function
  public close(): void {}
}
