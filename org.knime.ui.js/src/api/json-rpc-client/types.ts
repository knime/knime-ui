/* eslint-disable no-magic-numbers */
/* eslint-disable no-undefined */
/* eslint-disable no-use-before-define */
export type JSONRPC = '2.0';
export const JSONRPC: JSONRPC = '2.0';

export type JSONRPCID = string | number | null;
export type JSONRPCParams = any;

// eslint-disable-next-line no-extra-parens
export const isJSONRPCID = (id: any): id is JSONRPCID => (
    typeof id === 'undefined' ||
    typeof id === 'string' ||
    typeof id === 'number' ||
    id === null
);

export interface JSONRPCRequest {
  jsonrpc: JSONRPC;
  method: string;
  params?: JSONRPCParams;
  id?: JSONRPCID;
}

export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;

export interface JSONRPCSuccessResponse {
  jsonrpc: JSONRPC;
  id: JSONRPCID;
  result: any;
  error?: undefined;
}

export interface JSONRPCErrorResponse {
  jsonrpc: JSONRPC;
  id: JSONRPCID;
  result?: undefined;
  error: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export const ErrorCodes = {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    internalError: -32603
} as const;
