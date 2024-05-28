<script lang="ts" setup>
import { computed } from "vue";

import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import LoadingIcon from "webapps-common/ui/components/LoadingIcon.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import ServerIcon from "webapps-common/ui/assets/img/icons/server-racks.svg";
import PrivateSpaceIcon from "webapps-common/ui/assets/img/icons/private-space.svg";
import ComputerDesktopIcon from "@/assets/computer-desktop.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";

import { SpaceProviderNS } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { useIcons } from "./useIcons";

interface Props {
  showText?: boolean;
  projectId: string;
}

const store = useStore();
const props = withDefaults(defineProps<Props>(), { showText: true });

const { getSpaceIcon, getSpaceProviderIcon, getSpaceGroupIcon } = useIcons();

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

type AllMetadata =
  | SingleSpaceProviderMetadata
  | SignInMetadata
  | SpaceGroupMetadata
  | SpaceMetadata;

// groups and headlines are not clickable
type ClickableItemsMetadata =
  | SpaceMetadata
  | SignInMetadata
  | SingleSpaceProviderMetadata;

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

const setProjectPathAndLoadWorkflowGroupContent = async (
  projectId: string,
  spaceProviderId: string,
  spaceId: string,
) => {
  store.commit("spaces/setProjectPath", {
    projectId,
    value: {
      spaceId,
      spaceProviderId,
      itemId: "root",
    },
  });
  await store.dispatch("spaces/fetchWorkflowGroupContent", { projectId });
};

const onSpaceChange = async ({
  metadata,
}: MenuItem<ClickableItemsMetadata>) => {
  const { projectId } = props;

  if (!metadata) {
    return;
  }

  // just load content if we are already connected
  if (!isSignInItem(metadata!)) {
    await setProjectPathAndLoadWorkflowGroupContent(
      projectId,
      metadata.spaceProviderId,
      metadata.space.id,
    );
    return;
  }

  const { spaceProviderId } = metadata;

  // handle sign in request
  const { spaces: [firstSpace = null] = [] } = await store.dispatch(
    "spaces/connectProvider",
    { spaceProviderId },
  );

  // change to first space if we have one
  if (firstSpace) {
    await setProjectPathAndLoadWorkflowGroupContent(
      projectId,
      spaceProviderId!,
      firstSpace.id,
    );
  }
};

const activeSpacePath = computed(
  () => store.state.spaces.projectPath[props.projectId],
);
const spaceProviders = computed(() => store.state.spaces.spaceProviders);

const createProviderHeadlineMenuItem = (
  provider: SpaceProviderNS.SpaceProvider,
): MenuItem => ({
  text: provider.name,
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
  SpaceGroupMetadata | SpaceMetadata | SingleSpaceProviderMetadata
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

const spacesDropdownData = computed((): Array<MenuItem<AllMetadata>> => {
  const isLoading =
    store.state.spaces.isLoadingProviders ||
    store.state.spaces.isConnectingToProvider;

  if (isLoading) {
    // @ts-ignore
    return [{ text: "Loading…", disabled: true, icon: LoadingIcon }];
  }

  const providers = Object.values(spaceProviders.value ?? {});

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

  return providers.flatMap((provider) => {
    const base: Array<MenuItem<AllMetadata>> = [];

    return base.concat(getHeadline(provider) ?? []).concat(
      provider.connected
        ? createMenuEntries(provider.spaceGroups, provider)
        : // only add sign-in option for disconnected providers
          [createSignInMenuItem(provider)],
    );
  });
});

const selectedText = computed(() => {
  const selectedRootItem = spacesDropdownData.value.find((item) =>
    item.metadata && isSpaceGroupItem(item.metadata)
      ? item.metadata.active
      : item.selected,
  );

  if (!selectedRootItem) {
    return "";
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
    return "";
  }

  return `${selectedChildItem.metadata.space.owner} – ${selectedChildItem.metadata.space.name}`;
});

const spaceIcon = computed(() => {
  const activeSpaceInfo = store.getters["spaces/getSpaceInfo"](props.projectId);
  const isLocal = store.getters["spaces/isLocalProvider"](props.projectId);
  const isServer = store.getters["spaces/isServerProvider"](props.projectId);

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
      @item-click="(e, item) => onSpaceChange(item)"
    >
      <template #default="{ expanded }">
        <template v-if="showText">
          <Component :is="spaceIcon" />
          <span class="selected-text">{{ selectedText }}</span>
        </template>
        <DropdownIcon class="dropdown-icon" :class="{ flip: expanded }" />
      </template>
    </SubMenu>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.space-selection-dropdown {
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
