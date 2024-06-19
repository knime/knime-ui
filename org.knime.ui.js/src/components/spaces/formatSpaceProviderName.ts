import type { SpaceProviderNS } from "@/api/custom-types";
import { COMMUNITY_HUB_ID, isHubProvider } from "@/store/spaces/util";

const urlRegex = /\(https?:\/\/[^\s)]+\)/g;

// TODO to be removed with NXT-2680
export const formatSpaceProviderName = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  if (isHubProvider(spaceProvider)) {
    const communityHubName = "KNIME Community Hub";
    if (spaceProvider.id === COMMUNITY_HUB_ID) {
      return communityHubName;
    }

    const urlMatch = spaceProvider.name.match(urlRegex)?.at(0);
    if (urlMatch?.includes("hubdev.knime.com")) {
      return `${communityHubName} (DEV)`;
    }
  }

  return spaceProvider.name.replace(urlRegex, "").trimEnd();
};
