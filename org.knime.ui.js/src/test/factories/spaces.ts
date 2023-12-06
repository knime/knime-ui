import { merge } from "lodash-es";

import { SpaceProviderNS } from "@/api/custom-types";
import type { DeepPartial } from "../utils";

export const createSpace = (
  data: DeepPartial<SpaceProviderNS.Space> = {},
): SpaceProviderNS.Space => {
  const base: SpaceProviderNS.Space = {
    id: "space1",
    name: "Space 1",
    owner: "j.doe",
    private: true,
    description: "mock space",
  };

  return merge(base, data);
};

export const createSpaceProvider = (
  data: DeepPartial<SpaceProviderNS.SpaceProvider> = {},
): SpaceProviderNS.SpaceProvider => {
  const base: SpaceProviderNS.SpaceProvider = {
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
    spaces: [],
  };

  return merge(base, data);
};
