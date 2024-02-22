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
}) => {
  consola.info(`Webswing: Opening dialog for <${projectId}, ${workflowId}, ${nodeId}>`);
  const response = await client.call("WebswingService.openDialog", [
    projectId,
    workflowId,
    nodeId,
  ]);
  return response;
};

// const base64codes = [
//   255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
//   255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
//   255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63,
//   52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255,
//   255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
//   15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255,
//   255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
//   41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
// ];
  
// const getBase64Code = (charCode: any) => {
//   if (charCode >= base64codes.length) {
//     throw new Error("Unable to parse base64 string.");
//   }
//   const code = base64codes[charCode];
//   if (code === 255) {
//     throw new Error("Unable to parse base64 string.");
//   }
//   return code;
// };

// /**
//  * TODO: Find out if this is correct.
//  */
// const base64ToBytes = (str: any) => {
//   if (str.length % 4 !== 0) {
//     throw new Error("Unable to parse base64 string.");
//   }
//   const index = str.indexOf("=");
//   if (index !== -1 && index < str.length - 2) {
//     throw new Error("Unable to parse base64 string.");
//   }
//   const missingOctets = str.endsWith("==") ? 2 : (str.endsWith("=") ? 1 : 0);
//   const n = str.length;
//   const result = new Uint8Array(3 * (n / 4));
//   let buffer;
//   for (let i = 0, j = 0; i < n; i += 4, j += 3) {
//     buffer =
//       getBase64Code(str.charCodeAt(i)) << 18 |
//       getBase64Code(str.charCodeAt(i + 1)) << 12 |
//       getBase64Code(str.charCodeAt(i + 2)) << 6 |
//       getBase64Code(str.charCodeAt(i + 3));
//     result[j] = buffer >> 16;
//     result[j + 1] = (buffer >> 8) & 0xFF;
//     result[j + 2] = buffer & 0xFF;
//   }
//   return result.subarray(0, result.length - missingOctets);
// };

/**
 * TODO: Find out if this is correct.
 */
const base64ToBytes = (base64: string) => {
  const binString = atob(base64);
  const array = Uint8Array.from(binString, (m) => m.codePointAt(0)); // eslint-disable-line
  return new TextDecoder().decode(array);
}

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
  if (message === "close") {
    consola.info("Webswing: Closing the current dialog");
  }
  if (messageConsumer) {
    const bytes = base64ToBytes(message);
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
