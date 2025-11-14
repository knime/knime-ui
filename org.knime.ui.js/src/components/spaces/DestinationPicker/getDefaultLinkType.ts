import { LinkType } from "@/api/gateway-api/generated-api";
import { localRootProjectPath } from "@/store/spaces/caching";

const DEFAULT_LINK_TYPE_LOCAL = LinkType.TypeEnum.MOUNTPOINTABSOLUTE;
const DEFAULT_LINK_TYPE_REMOTE = LinkType.TypeEnum.MOUNTPOINTABSOLUTEIDBASED;

export const getDefaultLinkType = (selectedSpaceId: string) => {
  const isLocal = selectedSpaceId === localRootProjectPath.spaceId;
  return isLocal ? DEFAULT_LINK_TYPE_LOCAL : DEFAULT_LINK_TYPE_REMOTE;
};
