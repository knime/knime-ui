/* eslint-disable no-magic-numbers */
/* eslint-disable no-undefined */
/* eslint-disable no-use-before-define */
export type JSONRPC = "2.0";
// eslint-disable-next-line no-redeclare
export const JSONRPC: JSONRPC = "2.0";

export type JSONRPCID = string | number | null;
export type JSONRPCParams = any;

export interface JSONRPCRequest {
  jsonrpc: JSONRPC;
  method: string;
  params?: JSONRPCParams;
  id?: JSONRPCID;
}
export interface JSONRPCResponse {
  jsonrpc: JSONRPC;
  id: JSONRPCID;
  result: any;
  error?: undefined;
}

export type JSONRPCClient = {
  request: <T = any>(request: JSONRPCRequest) => Promise<T>;
};
