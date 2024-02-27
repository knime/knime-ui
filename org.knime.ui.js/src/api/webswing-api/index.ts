import { sendBinaryMessage } from "../json-rpc-client";
import type { RPCClient } from "@/api/gateway-api/rpc-client";

let client: RPCClient, messageConsumer: any;

/**
 * Starts a Webswing session
 */
const startSession = (): void => {
  consola.info("Webswing: Starting new session");
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
}) => { // TODO: Don't run this over and over again
  consola.info(`Webswing: Opening dialog for <${projectId}, ${workflowId}, ${nodeId}>`);
  const response = await client.call("WebswingService.openDialog", [
    projectId,
    workflowId,
    nodeId,
  ]);
  return response;
};

const base64ToBytes = (str: any) => {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Sets the binary message consumer
 */
const setMessageConsumer = (consumer: any) => {
  messageConsumer = consumer;
};

/**
 * Consumes a `WebSwingEvent`
 */
const applyMessageConsumer = (message: string) => {
  if (message === "close") { // TODO: Actually implement this
    consola.info("Webswing: Closing the current dialog");
    return;
  }
  if (messageConsumer) {
    const bytes = base64ToBytes(message);
    // debugger;
    messageConsumer(bytes);  
  }
}

/**
 * Removes the binary message consumer
 */
const removeMessageConsumer = () => {
  messageConsumer = null;
};

/**
 * Sends a binary message to the server
 */
const sendMessage = (message: ArrayBuffer) => {
  consola.info(`Webswing: Sent binary message <${message}>`);
  sendBinaryMessage(message);
}


export const init = (
  rpcClient: RPCClient,
): {
  startSession: any;
  openDialog: any;
  sendMessage: any;
  setMessageConsumer: any;
  applyMessageConsumer: any;
  removeMessageConsumer: any;

} => {
  client = rpcClient;
  return {
    startSession,
    openDialog,
    sendMessage,
    setMessageConsumer,
    applyMessageConsumer,
    removeMessageConsumer 
  };
};
