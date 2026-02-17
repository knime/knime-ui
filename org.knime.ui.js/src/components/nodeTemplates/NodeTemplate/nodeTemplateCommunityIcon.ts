import { SpaceProviderNS } from "@/api/custom-types";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";

export const isComponentNodeTemplate = (
  data: NodeTemplateWithExtendedPorts | ComponentNodeTemplateWithExtendedPorts,
): data is ComponentNodeTemplateWithExtendedPorts => Boolean(data.component);

export const shouldShowCommunityIcon = (
  data: NodeTemplateWithExtendedPorts | ComponentNodeTemplateWithExtendedPorts,
): boolean => {
  if (isComponentNodeTemplate(data)) {
    const ownerName = data.owner?.name ?? null;
    if (!ownerName) {
      return false;
    }

    const providersStore = useSpaceProvidersStore();
    const hubProvider = Object.values(providersStore.spaceProviders).find(
      (provider) => provider.type === SpaceProviderNS.TypeEnum.HUB,
    );
    if (!hubProvider) {
      return false;
    }

    if (data.owner?.isTeam) {
      const teamNames = (hubProvider.spaceGroups ?? [])
        .filter((group) => group.type === SpaceProviderNS.UserTypeEnum.TEAM)
        .map((group) => group.name);
      return !teamNames.includes(ownerName);
    }

    return hubProvider.username ? ownerName !== hubProvider.username : true;
  }

  return Boolean(data.extension?.vendor && !data.extension.vendor.isKNIME);
};
