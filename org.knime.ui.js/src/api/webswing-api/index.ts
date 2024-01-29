import {
  sendBinaryMessage,
  addBinaryEventListener,
  type RPCClient,
} from "@/api/gateway-api/rpc-client";

let client: RPCClient = null;

/**
 * Starts a Webswing session
 */
const startSession = (): void => {
  client.call("WebswingService.startSession", null);
};

/**
 * Opens a Webswing dialog for a node
 */
const openDialog = async ({ projectId, workflowId, nodeId }) => {
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
  startSession;
  openDialog;
  sendBinaryMessage;
  addBinaryEventListener;
} => {
  client = rpcClient;
  return {
    startSession,
    openDialog,
    sendBinaryMessage,
    addBinaryEventListener,
  };
};
