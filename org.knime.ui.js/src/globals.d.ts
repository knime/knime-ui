declare let consola: import('consola').Consola;

declare function jsonrpc(request: {
    jsonrpc: string;
    method: string;
    params: Array<unknown>,
    id: number;
}): Promise<unknown>

declare function jsonrpcNotification(jsonRequest: string): string;
