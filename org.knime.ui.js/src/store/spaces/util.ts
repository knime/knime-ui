import type { SpaceProviderNS } from "@/api/custom-types";

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
