import { SpaceProviderNS, type WorkflowOrigin } from "@/api/custom-types";
import type { Project } from "@/api/gateway-api/generated-api";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";

const { KNIME_HUB_HOME_HOSTNAME, KNIME_HUB_DEV_HOSTNAME } = knimeExternalUrls;

export const findSpaceById = (
  spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  spaceId: string,
) => {
  const providers = Object.values(spaceProviders);
  const groups = providers.flatMap((provider) => provider.spaceGroups ?? []);
  const spaces = groups.flatMap((group) => group.spaces ?? []);

  return spaces.find((space) => space.id === spaceId);
};

export const findSpaceGroupFromSpaceId = (
  spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  spaceId: string,
) => {
  const providers = Object.values(spaceProviders);
  const groups = providers.flatMap(({ spaceGroups }) => spaceGroups ?? []);

  return groups.find((group) =>
    (group.spaces ?? []).some((space) => space.id === spaceId),
  );
};

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

export const formatSpaceProviderName = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  if (
    isHubProvider(spaceProvider) &&
    spaceProvider.hostname?.includes(KNIME_HUB_DEV_HOSTNAME)
  ) {
    return `${spaceProvider.name} (DEV)`;
  }

  return spaceProvider.name;
};

export const isCommunityHubProvider = (
  provider: SpaceProviderNS.SpaceProvider,
) =>
  provider.connected &&
  (provider.hostname?.includes(KNIME_HUB_HOME_HOSTNAME) ?? false);
