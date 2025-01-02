import type { RPCClient } from "./rpc-client";

export interface Configuration {
  createRPCClient: () => RPCClient;
  postProcessCommandResponse?: <T>(response: Promise<T>) => Promise<T>;
}
