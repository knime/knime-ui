import { createRPCClient } from "@/api/gateway-api/rpc-client";
import { waitForPatch } from "@/util/event-syncer";

import { createAPI } from "./generated-api";

const postProcessCommandResponse = async (commandCall: Promise<any>) => {
  const response = await commandCall;
  if (!response || !response.snapshotId) {
    return Promise.resolve(response);
  }

  await waitForPatch(response.snapshotId);
  return response;
};

export const gateway = createAPI({ url: "", postProcessCommandResponse });

// TODO(AP-22380): Remove this. This is part of a temporary solution in the UIExtensionApiLayer of the node configuration for enabling nested UIExtensions.
export const gatewayRpcClient = createRPCClient({
  url: "",
  postProcessCommandResponse,
});
