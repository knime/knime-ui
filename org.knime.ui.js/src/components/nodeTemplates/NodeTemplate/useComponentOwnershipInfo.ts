import { type Ref, computed } from "vue";

import { SpaceProviderNS } from "@/api/custom-types";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/util/dataMappers";

type NodeTemplateInput =
  | NodeTemplateWithExtendedPorts
  | ComponentNodeTemplateWithExtendedPorts;

export const useComponentOwnershipInfo = (
  nodeTemplate: Ref<NodeTemplateInput>,
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
  const hubUsername = computed(() => hubProvider.value?.username ?? null);

  const isComponent = computed(() =>
    Boolean(
      (nodeTemplate.value as ComponentNodeTemplateWithExtendedPorts).component,
    ),
  );
  const componentOwner = computed(() =>
    isComponent.value
      ? (nodeTemplate.value as ComponentNodeTemplateWithExtendedPorts).owner
      : null,
  );
  const containingSpace = computed(() =>
    isComponent.value
      ? (nodeTemplate.value as ComponentNodeTemplateWithExtendedPorts)
          .containingSpace
      : null,
  );

  const ownerLabel = computed(() => {
    if (!isComponent.value) {
      return null;
    }

    const owner = componentOwner.value;
    if (!owner?.name) {
      if (owner?.isTeam === true) {
        return "a team";
      }
      if (owner?.isTeam === false) {
        return "a user";
      }
      return "an unknown owner";
    }

    if (owner.isTeam) {
      return hubTeamNames.value.includes(owner.name)
        ? `your team "${owner.name}"`
        : `team "${owner.name}"`;
    }

    return hubUsername.value && owner.name === hubUsername.value
      ? "you"
      : `user "${owner.name}"`;
  });

  const componentTooltipText = computed(() => {
    if (!isComponent.value) {
      return null;
    }

    const spaceName = containingSpace.value ?? null;
    const owner = ownerLabel.value;
    if (spaceName && owner) {
      return `From space "${spaceName}" owned by ${owner}.`;
    }
    if (spaceName) {
      return `From space "${spaceName}".`;
    }
    if (owner) {
      return `Owned by ${owner}.`;
    }
    return "Component ownership information is unavailable.";
  });

  const showCommunityIcon = computed(() => {
    if (!isComponent.value) {
      return Boolean(
        nodeTemplate.value.extension?.vendor &&
          !nodeTemplate.value.extension.vendor.isKNIME,
      );
    }

    const owner = componentOwner.value;
    const ownerName = owner?.name ?? null;
    if (!ownerName) {
      return false;
    }

    const hubProviderValue = hubProvider.value;
    if (!hubProviderValue) {
      return false;
    }

    if (owner?.isTeam) {
      return !hubTeamNames.value.includes(ownerName);
    }

    return hubUsername.value ? ownerName !== hubUsername.value : true;
  });

  return {
    componentTooltipText,
    isComponent,
    ownerLabel,
    showCommunityIcon,
  };
};
