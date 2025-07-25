import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import type { MenuItem } from "@knime/components";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import {
  formatSpaceProviderName,
  isCommunityHubProvider,
} from "@/store/spaces/util";
import { useSpaceIcons } from "../useSpaceIcons";

import type {
  AllMetadata,
  ExternalLinkMetadata,
  SignInMetadata,
  SingleSpaceProviderMetadata,
  SpaceGroupMetadata,
  SpaceMetadata,
} from "./types";

type UseSpaceSelectionMenuItemsOptions = {
  projectId: Ref<string>;
};

export const useSpaceSelectionMenuItems = (
  options: UseSpaceSelectionMenuItemsOptions,
) => {
  const { getSpaceIcon, getSpaceProviderIcon, getSpaceGroupIcon } =
    useSpaceIcons();

  const { projectPath } = storeToRefs(useSpaceCachingStore());

  const activeSpacePath = computed(
    () => projectPath.value[options.projectId.value],
  );

  const isSignInItem = (metadata: AllMetadata): metadata is SignInMetadata => {
    return metadata.type === "sign-in";
  };

  const spaceToMenuItem =
    (provider: SpaceProviderNS.SpaceProvider) =>
    (space: SpaceProviderNS.Space): MenuItem<SpaceMetadata> => {
      const getIcon = () => {
        if (provider.type !== SpaceProviderNS.TypeEnum.HUB) {
          return null;
        }

        return getSpaceIcon(space);
      };

      return {
        text: space.name,
        // eslint-disable-next-line no-undefined
        icon: getIcon() ?? undefined,
        selected:
          provider.id === activeSpacePath.value?.spaceProviderId &&
          space.id === activeSpacePath.value?.spaceId,
        metadata: {
          type: "space",
          spaceProviderId: provider.id,
          space,
        },
      };
    };

  const createProviderHeadlineMenuItem = (
    provider: SpaceProviderNS.SpaceProvider,
  ): MenuItem => ({
    text: formatSpaceProviderName(provider),
    icon: getSpaceProviderIcon(provider),
    selected: false,
    sectionHeadline: true,
    separator: true,
  });

  const createSignInMenuItem = (
    provider: SpaceProviderNS.SpaceProvider,
  ): MenuItem<SignInMetadata> => ({
    text: "Sign in",
    selected: false,
    sectionHeadline: false,
    separator: false,
    metadata: {
      type: "sign-in",
      spaceProviderId: provider.id,
    },
  });

  const createSpaceSelectionMenuItems = (
    groups: SpaceProviderNS.SpaceGroup[],
    provider: SpaceProviderNS.SpaceProvider,
  ): MenuItem<
    | SpaceGroupMetadata
    | SpaceMetadata
    | SingleSpaceProviderMetadata
    | ExternalLinkMetadata
  >[] => {
    // local and server always have a single space, so no need to show a nested menu
    const shouldHaveChildren = () =>
      provider.type === SpaceProviderNS.TypeEnum.HUB;

    return groups.map((group) => {
      const isActiveProvider =
        provider.id === activeSpacePath.value?.spaceProviderId;

      if (shouldHaveChildren()) {
        const isActiveSpaceInGroup = group.spaces.some(
          (space) => space.id === activeSpacePath.value?.spaceId,
        );

        return {
          text: group.name,
          children: group.spaces.map(spaceToMenuItem(provider)),
          icon: getSpaceGroupIcon(group),
          // cannot use the `selected` property because this is a parent item (which spawns a submenu)
          // and the `selected` property on these type of items messes up the styles (hover, focused, etc)
          metadata: { type: "space-group", active: isActiveSpaceInGroup },
        } satisfies MenuItem<SpaceGroupMetadata | SpaceMetadata>;
      }

      const space = group.spaces.at(0)!;

      // item without children, refers to the main group of a single-group provider
      // e.g: local space and server space
      const item: MenuItem<SingleSpaceProviderMetadata> = {
        text: space.name,
        selected: isActiveProvider,
        icon: getSpaceProviderIcon(provider),
        separator: true,
        metadata: {
          type: "single-space-provider",
          space,
          spaceProviderId: provider.id,
        },
      };

      return item;
    });
  };

  const {
    spaceProviders,
    isConnectingToProvider,
    loadingProviderSpacesData,
    getCommunityHubInfo,
  } = storeToRefs(useSpaceProvidersStore());

  // We need to group USER spaces by owner. Currently when user A shares
  // a personal space with user B, this is sent as a space under user B's data.
  // However, we want to show it in the UI separately as users A & B to make it easier
  // to distinguish
  const spaceProvidersGroupedByOwner = computed(() => {
    return Object.values(spaceProviders.value ?? {}).map((provider) => {
      const restructuredSpaceGroups: SpaceProviderNS.SpaceGroup[] = [];

      (provider.spaceGroups ?? []).forEach((group) => {
        if (group.type === SpaceProviderNS.UserTypeEnum.TEAM) {
          restructuredSpaceGroups.push(group);
          return;
        }

        const spacesByOwner: Record<string, SpaceProviderNS.Space[]> = {};

        group.spaces.forEach((space) => {
          if (!spacesByOwner[space.owner]) {
            spacesByOwner[space.owner] = [];
          }
          spacesByOwner[space.owner].push(space);
        });

        Object.entries(spacesByOwner).forEach(([owner, spaces]) => {
          restructuredSpaceGroups.push({
            id: `${group.id}-${owner}`,
            name: owner,
            spaces,
            type: SpaceProviderNS.UserTypeEnum.USER,
          });
        });
      });

      return {
        ...provider,
        spaceGroups: restructuredSpaceGroups,
      };
    });
  });

  // type Foo = Array<MenuItem<AllMetadata>

  const spaceSelectionItems = computed<Array<MenuItem<AllMetadata>>>(() => {
    const providers = Object.values(spaceProvidersGroupedByOwner.value ?? {});

    const shouldShowCreateTeamOption = (
      provider: SpaceProviderNS.SpaceProvider,
    ) => {
      if (
        !isCommunityHubProvider(provider) ||
        !getCommunityHubInfo.value.isOnlyCommunityHubMounted
      ) {
        return false;
      }
      return (provider.spaceGroups ?? []).every(
        (group) => group.type === SpaceProviderNS.UserTypeEnum.USER,
      );
    };

    const getHeadline = (
      provider: SpaceProviderNS.SpaceProvider,
    ): MenuItem | null => {
      if (provider.type === SpaceProviderNS.TypeEnum.LOCAL) {
        return null;
      }

      if (provider.type === SpaceProviderNS.TypeEnum.SERVER) {
        return provider.connected
          ? null
          : createProviderHeadlineMenuItem(provider);
      }

      return createProviderHeadlineMenuItem(provider);
    };

    const getProviderMenuEntries = (
      provider: SpaceProviderNS.SpaceProvider,
    ): MenuItem<AllMetadata>[] => {
      const isLoading =
        isConnectingToProvider.value === provider.id ||
        loadingProviderSpacesData.value[provider.id];

      if (isLoading) {
        return [
          {
            text: "Loading…",
            selected: false,
            sectionHeadline: false,
            separator: false,
          },
        ];
      }

      if (provider.connected) {
        const baseItems: MenuItem<AllMetadata>[] =
          createSpaceSelectionMenuItems(provider.spaceGroups, provider);

        // If this is a Hub provider and the user has NO team, add a “Create team” item
        if (shouldShowCreateTeamOption(provider)) {
          const createTeamItem: MenuItem<ExternalLinkMetadata> = {
            text: "Create Team",
            icon: LinkExternalIcon,
            selected: false,
            sectionHeadline: false,
            separator: false,
            metadata: {
              type: "external-link",
              url: knimeExternalUrls.TEAM_PLAN_URL,
            },
          };

          baseItems.push(createTeamItem);
        }

        return baseItems;
      }

      return [createSignInMenuItem(provider)];
    };

    return providers.flatMap((provider) => {
      const headline = getHeadline(provider);

      return headline
        ? ([headline].concat(
            getProviderMenuEntries(provider),
          ) as MenuItem<AllMetadata>[])
        : getProviderMenuEntries(provider);
    });
  });

  return {
    isSignInItem,
    spaceSelectionItems,
  };
};
