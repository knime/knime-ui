<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";
import ComputerDesktopIcon from "@knime/styles/img/icons/local-space.svg";
import PrivateSpaceIcon from "@knime/styles/img/icons/private-space.svg";
import ServerIcon from "@knime/styles/img/icons/server-racks.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { isLocalProvider, isServerProvider } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

import { formatSpaceProviderName } from "./formatSpaceProviderName";
import { useSpaceIcons } from "./useSpaceIcons";

interface Props {
  showText?: boolean;
  projectId: string;
}

const props = withDefaults(defineProps<Props>(), { showText: true });

const { projectPath } = storeToRefs(useSpaceCachingStore());
const { setProjectPath } = useSpaceCachingStore();
const { connectProvider } = useSpaceAuthStore();
const {
  spaceProviders,
  isConnectingToProvider,
  loadingProviderSpacesData,
  hasLoadedProviders,
  getProviderInfoFromProjectPath,
  getSpaceInfo,
} = storeToRefs(useSpaceProvidersStore());

const { getSpaceIcon, getSpaceProviderIcon, getSpaceGroupIcon } =
  useSpaceIcons();

const { toastPresets } = getToastPresets();

type SingleSpaceProviderMetadata = {
  type: "single-space-provider";
  spaceProviderId: string;
  space: SpaceProviderNS.Space;
};
type SignInMetadata = {
  type: "sign-in";
  spaceProviderId: string;
};
type SpaceGroupMetadata = {
  type: "space-group";
  active: boolean;
};
type SpaceMetadata = {
  type: "space";
  spaceProviderId: string;
  space: SpaceProviderNS.Space;
};
type ExternalLinkMetadata = {
  type: "external-link";
  url: string;
};

type AllMetadata =
  | SingleSpaceProviderMetadata
  | SignInMetadata
  | SpaceGroupMetadata
  | SpaceMetadata
  | ExternalLinkMetadata;

// groups and headlines are not clickable
type ClickableItemsMetadata =
  | SpaceMetadata
  | SignInMetadata
  | SingleSpaceProviderMetadata
  | ExternalLinkMetadata;

const isSignInItem = (metadata: AllMetadata): metadata is SignInMetadata => {
  return metadata.type === "sign-in";
};

const isSpaceGroupItem = (
  metadata: AllMetadata,
): metadata is SpaceGroupMetadata => {
  return metadata.type === "space-group";
};

const isClickableItem = (
  metadata: AllMetadata,
): metadata is ClickableItemsMetadata => {
  return ["space", "sign-in", "single-space-provider"].includes(metadata.type);
};

const setProjectPathFn = (
  projectId: string,
  spaceProviderId: string,
  spaceId: string,
) => {
  setProjectPath({
    projectId,
    value: {
      spaceId,
      spaceProviderId,
      itemId: "root",
    },
  });
};

const onSpaceChange = async ({
  metadata,
}: MenuItem<ClickableItemsMetadata>) => {
  const { projectId } = props;

  if (!metadata) {
    return;
  }

  if (metadata.type === "external-link") {
    window.open(metadata.url, "_blank");
    return;
  }

  // just load content if we are already connected
  if (!isSignInItem(metadata!)) {
    setProjectPathFn(projectId, metadata.spaceProviderId, metadata.space.id);
    return;
  }

  const { spaceProviderId } = metadata;

  try {
    // handle sign in request
    const { isConnected, providerData } = await connectProvider({
      spaceProviderId,
    });

    if (!isConnected) {
      return;
    }

    const firstSpace = providerData.spaceGroups.at(0)?.spaces.at(0);

    // change to first space if we have one
    if (firstSpace) {
      setProjectPathFn(projectId, spaceProviderId!, firstSpace.id);
    }
  } catch (error) {
    consola.error("Failed to sign in from SpaceSelectionDropdown", { error });

    const providerName =
      spaceProviders.value?.[spaceProviderId]?.name ?? "remote";

    toastPresets.spaces.auth.connectFailed({ error, providerName });
  }
};

const activeSpacePath = computed(() => projectPath.value[props.projectId]);

const spaceProvidersWithGroups = computed(() => {
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

const createMenuEntries = (
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

const spacesDropdownData = computed<Array<MenuItem<AllMetadata>>>(() => {
  const providers = Object.values(spaceProvidersWithGroups.value ?? {});

  const shouldShowCreateTeamOption = (
    provider: SpaceProviderNS.SpaceProvider,
  ) => {
    if (provider.type !== SpaceProviderNS.TypeEnum.HUB || !provider.connected) {
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
  ): MenuItem[] => {
    const isLoading =
      isConnectingToProvider.value === provider.id ||
      loadingProviderSpacesData.value[provider.id] ||
      !hasLoadedProviders.value;

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
      const baseItems: MenuItem<AllMetadata>[] = createMenuEntries(
        provider.spaceGroups,
        provider,
      );

      // If this is a Hub provider and the user has NO team, add a “Create team” item
      if (
        provider.type === SpaceProviderNS.TypeEnum.HUB &&
        shouldShowCreateTeamOption(provider)
      ) {
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
      ? [headline].concat(getProviderMenuEntries(provider))
      : getProviderMenuEntries(provider);
  });
});

const selectedText = computed(() => {
  const showFallbackText = () => {
    const isLoadingAnyItem =
      Boolean(isConnectingToProvider.value) ||
      Object.values(loadingProviderSpacesData.value).some(Boolean) ||
      !hasLoadedProviders.value;

    return isLoadingAnyItem ? "Loading…" : "";
  };

  const selectedRootItem = spacesDropdownData.value.find((item) =>
    item.metadata && isSpaceGroupItem(item.metadata)
      ? item.metadata.active
      : item.selected,
  );

  if (!selectedRootItem) {
    return showFallbackText();
  }

  if (!selectedRootItem.children) {
    return selectedRootItem.text;
  }

  const selectedChildItem = (selectedRootItem.children ?? []).find(
    (item) => item.selected,
  );

  if (
    !selectedChildItem ||
    !isClickableItem(selectedChildItem.metadata!) ||
    isSignInItem(selectedChildItem.metadata!)
  ) {
    return showFallbackText();
  }

  if (
    selectedChildItem.metadata.type === "space" ||
    selectedChildItem.metadata.type === "single-space-provider"
  ) {
    return `${selectedChildItem.metadata.space.owner} – ${selectedChildItem.metadata.space.name}`;
  }
  return showFallbackText();
});

const spaceIcon = computed(() => {
  const provider = getProviderInfoFromProjectPath.value(props.projectId);
  const activeSpaceInfo = getSpaceInfo.value(props.projectId);
  const isLocal = provider ? isLocalProvider(provider) : false;
  const isServer = provider ? isServerProvider(provider) : false;

  if (isLocal) {
    return ComputerDesktopIcon;
  }

  if (isServer) {
    return ServerIcon;
  }

  return activeSpaceInfo?.private ? PrivateSpaceIcon : CubeIcon;
});
</script>

<template>
  <div class="space-selection-dropdown">
    <SubMenu
      :teleport-to-body="false"
      :items="spacesDropdownData"
      class="submenu"
      button-title="Change space"
      orientation="left"
      @item-click="
        (_: MouseEvent, item: MenuItem<ClickableItemsMetadata>) =>
          onSpaceChange(item)
      "
    >
      <template #default="{ expanded }">
        <template v-if="showText">
          <Component :is="spaceIcon" />
          <span class="selected-text" :title="selectedText">
            {{ selectedText }}
          </span>
        </template>
        <DropdownIcon class="dropdown-icon" :class="{ flip: expanded }" />
      </template>
    </SubMenu>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.space-selection-dropdown {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  & .dropdown-icon {
    margin-left: 5px;
    margin-top: 3px;

    @mixin svg-icon-size 12;

    &.flip {
      transform: scaleY(-1);
    }
  }

  & :deep(.menu-items),
  & :deep(.menu-items-sub-level) {
    max-height: 60vh;
    overflow-y: auto;
  }

  /* TODO: NXT-2391, Rework the shared webapps common component to match the different cases */

  & :deep(.menu-items-sub-level) {
    & .list-item:not(.section-headline) {
      padding-left: 6px !important;
    }
  }

  & :deep(.menu-items) {
    & .list-item.section-headline {
      margin-left: -2px;

      & svg {
        margin-right: 4px;

        @mixin svg-icon-size 16;
      }
    }

    & .list-item:not(.section-headline) {
      padding-left: 32px;
    }

    & .separator:has(.clickable-item) > .list-item:has(svg) {
      padding-left: 10px;
    }
  }

  & .selected-text {
    max-width: 160px;
    overflow: hidden;
    display: inline-block;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & :deep(.submenu-toggle) {
    padding-left: 5px;
  }

  & :deep(.menu-wrapper) {
    & .separator:has(.section-headline) {
      border-bottom: none;
      border-top: 1px solid var(--knime-porcelain);

      & .text {
        color: var(--knime-masala);
      }
    }
  }
}
</style>
