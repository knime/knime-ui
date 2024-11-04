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
    spaceGroupId: "group1",
    providerId: "provider1",
  };

  return merge(base, data);
};

export const createSpaceGroup = (
  data: Partial<SpaceProviderNS.SpaceGroup> = {},
): SpaceProviderNS.SpaceGroup => {
  const base: SpaceProviderNS.SpaceGroup = {
    id: "group1",
    name: "Group 1",
    providerId: "provider1",
    type: SpaceProviderNS.UserTypeEnum.USER,
  };

  return merge(base, data);
};

export const createSpaceProvider = (
  data: Partial<SpaceProviderNS.SpaceProvider> = {},
): SpaceProviderNS.SpaceProvider => {
  const base: SpaceProviderNS.SpaceProvider = {
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
  };

  return merge(base, data);
};
