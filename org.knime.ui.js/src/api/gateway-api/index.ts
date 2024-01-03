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
