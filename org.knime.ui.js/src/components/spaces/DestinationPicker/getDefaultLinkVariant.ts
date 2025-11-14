import { LinkVariant } from "@/api/gateway-api/generated-api";
import { localRootProjectPath } from "@/store/spaces/caching";

const DEFAULT_LINK_VARIANT_LOCAL =
  LinkVariant.VariantEnum.MOUNTPOINTABSOLUTEPATH;
const DEFAULT_LINK_VARIANT_REMOTE =
  LinkVariant.VariantEnum.MOUNTPOINTABSOLUTEID;

export const getDefaultLinkVariant = (selectedSpaceId: string) => {
  const isLocal = selectedSpaceId === localRootProjectPath.spaceId;
  return isLocal ? DEFAULT_LINK_VARIANT_LOCAL : DEFAULT_LINK_VARIANT_REMOTE;
};
