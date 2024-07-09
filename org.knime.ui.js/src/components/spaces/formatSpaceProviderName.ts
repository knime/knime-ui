import type { SpaceProviderNS } from "@/api/custom-types";
import { isHubProvider } from "@/store/spaces/util";

export const formatSpaceProviderName = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  if (
    isHubProvider(spaceProvider) &&
    spaceProvider.hostname?.includes("hubdev.knime.com")
  ) {
    return `${spaceProvider.name} (DEV)`;
  }
  return spaceProvider.name;
};
