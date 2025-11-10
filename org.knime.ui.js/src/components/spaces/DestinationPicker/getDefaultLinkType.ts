import { ShareComponentCommand } from "@/api/gateway-api/generated-api";
import { localRootProjectPath } from "@/store/spaces/caching";

const DEFAULT_LINK_TYPE_LOCAL =
  ShareComponentCommand.LinkTypeEnum.MOUNTPOINTABSOLUTE;
const DEFAULT_LINK_TYPE_REMOTE =
  ShareComponentCommand.LinkTypeEnum.MOUNTPOINTABSOLUTEIDBASED;

export const getDefaultLinkType = (selectedSpaceId: string) => {
  const isLocal = selectedSpaceId === localRootProjectPath.spaceId;
  return isLocal ? DEFAULT_LINK_TYPE_LOCAL : DEFAULT_LINK_TYPE_REMOTE;
};
