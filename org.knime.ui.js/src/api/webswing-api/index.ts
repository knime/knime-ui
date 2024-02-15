import {
  sendBinaryMessage,
  addBinaryEventListener,
  type RPCClient,
} from "@/api/gateway-api/rpc-client";

let client: RPCClient;

/**
 * Starts a Webswing session
 */
const startSession = (): void => {
  client.call("WebswingService.startSession", {});
};

/**
 * Opens a Webswing dialog for a node
 */
const openDialog = async ({
  // @ts-ignore
  projectId,
  // @ts-ignore
  workflowId,
  // @ts-ignore
  nodeId
}) => {
  const response = await client.call("WebswingService.openDialog", [
    projectId,
    workflowId,
    nodeId,
  ]);
  return response;
};

export const init = (
  rpcClient: RPCClient,
): {
  startSession: any;
  openDialog: any;
  sendBinaryMessage: any;
  addBinaryEventListener: any;
} => {
  client = rpcClient;
  return {
    startSession,
    openDialog,
    sendBinaryMessage,
    addBinaryEventListener,
  };
};
