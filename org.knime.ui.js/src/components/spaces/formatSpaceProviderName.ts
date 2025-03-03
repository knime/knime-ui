import type { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { isHubProvider } from "@/store/spaces/util";

export const formatSpaceProviderName = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  if (
    isHubProvider(spaceProvider) &&
    spaceProvider.hostname?.includes(knimeExternalUrls.KNIME_HUB_DEV_HOSTNAME)
  ) {
    return `${spaceProvider.name} (DEV)`;
  }
  return spaceProvider.name;
};
