import { SpaceProviderNS, type WorkflowOrigin } from "@/api/custom-types";
import type { Project } from "@/api/gateway-api/generated-api";

export const isLocalProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
  spaceProvider.type === SpaceProviderNS.TypeEnum.LOCAL;

export const isHubProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
  spaceProvider.type === SpaceProviderNS.TypeEnum.HUB;

export const isServerProvider = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => spaceProvider.type === SpaceProviderNS.TypeEnum.SERVER;

export const isProjectOpen = (
  project: Project,
  referenceOrigin: WorkflowOrigin,
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  return (
    project.origin?.providerId === referenceOrigin.providerId &&
    project.origin?.spaceId === referenceOrigin.spaceId &&
    project.origin?.itemId === referenceOrigin.itemId &&
    isLocalProvider(spaceProvider)
  );
};
