/* eslint-disable no-undefined */
import { type Ref, computed } from "vue";

import { SpaceProviderNS } from "@/api/custom-types";
import {
  type ComponentNodeTemplateWithExtendedPorts,
  type NodeTemplateWithExtendedPorts,
  nodeTemplate,
} from "@/lib/data-mappers";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

type NodeTemplateInput =
  | NodeTemplateWithExtendedPorts
  | ComponentNodeTemplateWithExtendedPorts;

type UseComponentOwnershipInfoOptions = {
  nodeTemplate: Ref<NodeTemplateInput>;
};

export const useComponentOwnershipInfo = (
  options: UseComponentOwnershipInfoOptions,
) => {
  const providersStore = useSpaceProvidersStore();
  const hubProvider = computed(
    () =>
      Object.values(providersStore.spaceProviders).find(
        (provider) => provider.type === SpaceProviderNS.TypeEnum.HUB,
      ) ?? null,
  );

  const hubTeamNames = computed(() =>
    (hubProvider.value?.spaceGroups ?? [])
      .filter((group) => group.type === SpaceProviderNS.UserTypeEnum.TEAM)
      .map((group) => group.name),
  );
  const hubUserId = computed(() => hubProvider.value?.username ?? null);

  const componentTemplate = computed(() =>
    nodeTemplate.isComponentNodeTemplate(options.nodeTemplate.value)
      ? options.nodeTemplate.value
      : null,
  );

  const componentOwner = computed(() => componentTemplate.value?.owner);

  const containingSpace = computed(
    () => componentTemplate.value?.containingSpace,
  );

  const ownerLabel = computed(() => {
    if (!componentTemplate.value) {
      return null;
    }

    const owner = componentOwner.value;
    const UNKNOWN = "an unknown owner";

    if (!owner) {
      return UNKNOWN;
    }

    if (!owner.name) {
      if (owner?.isTeam === undefined) {
        return UNKNOWN;
      }

      return owner.isTeam ? "a team" : "a user";
    }

    if (owner.isTeam) {
      return hubTeamNames.value.includes(owner.name)
        ? `your team "${owner.name}"`
        : `team "${owner.name}"`;
    }

    const matchesHubUser = hubUserId.value && owner.id === hubUserId.value;

    return matchesHubUser ? "you" : `user "${owner.name}"`;
  });

  const tooltipText = computed(() => {
    if (!componentTemplate.value) {
      return null;
    }

    const spaceName = containingSpace.value ?? null;

    if (spaceName && ownerLabel.value) {
      return `From space "${spaceName}" owned by ${ownerLabel.value}.`;
    }

    if (spaceName) {
      return `From space "${spaceName}".`;
    }

    if (ownerLabel.value) {
      return `Owned by ${ownerLabel.value}.`;
    }

    return "Component ownership information is unavailable.";
  });

  const isFromCommunity = computed(() => {
    if (!hubProvider.value || !componentTemplate.value) {
      return false;
    }

    if (!componentOwner.value) {
      return false;
    }

    const { name, isTeam } = componentOwner.value;

    if (isTeam) {
      return !hubTeamNames.value.includes(name ?? "");
    }

    return hubUserId.value
      ? componentOwner.value?.id !== hubUserId.value
      : true;
  });

  const ownershipInfo = computed(() => {
    if (!componentTemplate.value || !ownerLabel.value || !tooltipText.value) {
      return null;
    }

    return {
      isFromCommunity: isFromCommunity.value,
      ownerLabel: ownerLabel.value,
      tooltip: tooltipText.value,
    };
  });

  return {
    ownershipInfo,
  };
};
