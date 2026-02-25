<script lang="ts" setup>
import { computed, toRef } from "vue";
import { storeToRefs } from "pinia";

import { LoadingIcon, SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import ComputerDesktopIcon from "@knime/styles/img/icons/local-space.svg";
import PrivateSpaceIcon from "@knime/styles/img/icons/private-space.svg";
import ServerIcon from "@knime/styles/img/icons/server-racks.svg";

import { getToastPresets } from "@/services/toastPresets";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import {
  findSpaceById,
  isHubProvider,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";

import type { ClickableItemsMetadata } from "./types";
import { useSpaceSelectionMenuItems } from "./useSpaceSelecctionMenuItems";

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
  getProviderInfoFromProjectPath,
} = storeToRefs(useSpaceProvidersStore());

const { toastPresets } = getToastPresets();

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

const { isSignInItem, spaceSelectionItems } = useSpaceSelectionMenuItems({
  projectId: toRef(props, "projectId"),
});

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

const isLoadingCurrentProvider = computed(() => {
  if (!activeSpacePath.value) {
    return true;
  }

  const { spaceProviderId } = activeSpacePath.value;
  const provider = (spaceProviders.value ?? {})[spaceProviderId];

  if (!provider || !spaceProviders.value) {
    consola.warn("Invalid state for SpaceSelectionDropdown");
    return true;
  }

  return (
    isConnectingToProvider.value === provider.id ||
    loadingProviderSpacesData.value[provider.id]
  );
});

const dropdownText = computed(() => {
  if (isLoadingCurrentProvider.value) {
    return "Loading…";
  }

  const { spaceProviderId, spaceId } = activeSpacePath.value!;
  const provider = (spaceProviders.value ?? {})[spaceProviderId];

  if (!provider || !spaceProviders.value) {
    consola.warn("Invalid state for SpaceSelectionDropdown");
    return "";
  }

  if (isHubProvider(provider)) {
    const space = findSpaceById(spaceProviders.value, spaceId)!;

    return `${space.owner} – ${space.name}`;
  }

  return provider.name;
});

const activeSpaceInfo = computed(() => {
  // spaces data has not been cached or providers are not yet loaded
  if (
    !projectPath.value.hasOwnProperty(props.projectId) ||
    !spaceProviders.value
  ) {
    return null;
  }

  const { spaceId } = projectPath.value[props.projectId];
  const spaceProvider = getProviderInfoFromProjectPath.value(props.projectId);

  if (!spaceProvider) {
    return null;
  }

  const space = findSpaceById({ [spaceProvider.id]: spaceProvider }, spaceId);

  return space ?? null;
});

const spaceIcon = computed(() => {
  if (isLoadingCurrentProvider.value) {
    return LoadingIcon;
  }

  const provider = getProviderInfoFromProjectPath.value(props.projectId);
  const isLocal = provider ? isLocalProvider(provider) : false;
  const isServer = provider ? isServerProvider(provider) : false;

  if (isLocal) {
    return ComputerDesktopIcon;
  }

  if (isServer) {
    return ServerIcon;
  }

  return activeSpaceInfo.value?.private ? PrivateSpaceIcon : CubeIcon;
});
</script>

<template>
  <div class="space-selection-dropdown" data-test-id="space-selection-dropdown">
    <SubMenu
      :teleport-to-body="false"
      :items="spaceSelectionItems"
      class="submenu"
      button-title="Change space"
      orientation="left"
      aria-label="Space selection dropdown"
      @item-click="
        (_: MouseEvent, item: MenuItem<ClickableItemsMetadata>) =>
          onSpaceChange(item)
      "
    >
      <template #default="{ expanded }">
        <template v-if="showText">
          <Component :is="spaceIcon" />
          <span class="selected-text" :title="dropdownText">
            {{ dropdownText }}
          </span>
        </template>
        <DropdownIcon
          class="dropdown-icon"
          :class="{ flip: expanded }"
          aria-hidden="true"
          focusable="false"
        />
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
