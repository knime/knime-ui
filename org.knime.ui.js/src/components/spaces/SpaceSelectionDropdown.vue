<script lang="ts" setup>
import { computed } from "vue";
import { useStore } from "vuex";

import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import LoadingIcon from "webapps-common/ui/components/LoadingIcon.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PrivateSpaceIcon from "webapps-common/ui/assets/img/icons/private-space.svg";
import ComputerDesktopIcon from "@/assets/computer-desktop.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";

import type { RootStoreState } from "@/store/types";
import type { SpaceProviderNS } from "@/api/custom-types";
import type { Space } from "@/api/gateway-api/generated-api";

interface Props {
  showText?: boolean;
  projectId: string | null;
}

const store = useStore<RootStoreState>();
const props = withDefaults(defineProps<Props>(), { showText: true });

const onSpaceChange = async ({
  metadata: { spaceId, spaceProviderId, requestSignIn = false },
}: MenuItem) => {
  const { projectId } = props;

  // handle sign in request
  if (requestSignIn) {
    await store.dispatch("spaces/connectProvider", { spaceProviderId });
    return;
  }

  // set project path and re-fetch content
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

const spacesDropdownData = computed((): MenuItem[] => {
  if (store.state.spaces.isLoadingProvider) {
    return [
      {
        text: "Loading…",
        disabled: true,
        // @ts-ignore
        icon: LoadingIcon,
      },
    ];
  }

  const activeSpacePath = store.state.spaces.projectPath[props.projectId];
  const spaceProviders = store.state.spaces.spaceProviders;

  const providerHeadlineMenuItem = (
    provider: SpaceProviderNS.SpaceProvider,
  ): MenuItem => ({
    text: provider.name,
    selected: false,
    sectionHeadline: true,
    separator: true,
    metadata: {
      id: provider.id,
    },
  });

  const spaceMenuItem =
    (provider: SpaceProviderNS.SpaceProvider) =>
    (space: Space): MenuItem => ({
      text:
        provider.connectionMode === "AUTOMATIC" || space.owner === ""
          ? space.name
          : `${space.owner} – ${space.name}`,

      selected:
        provider.id === activeSpacePath?.spaceProviderId &&
        space.id === activeSpacePath?.spaceId,

      sectionHeadline: false,
      separator: false,
      metadata: {
        id: `${provider.id}__${space.id}`,
        spaceId: space.id,
        spaceProviderId: provider.id,
        requestSignIn: false,
      },
    });

  const signInMenuItem = (
    provider: SpaceProviderNS.SpaceProvider,
  ): MenuItem => ({
    text: "Sign in",
    selected: false,
    sectionHeadline: false,
    separator: false,
    metadata: {
      id: `${provider.id}__SIGN_IN`,
      spaceId: null,
      spaceProviderId: provider.id,
      requestSignIn: true,
    },
  });

  const providers = spaceProviders ? Object.values(spaceProviders) : [];

  return providers.flatMap((provider) => {
    // headline for all spaces except local
    const witHeadline = provider.local
      ? []
      : [providerHeadlineMenuItem(provider)];

    return witHeadline.concat(
      // create a menu item for each space, offer to sign in if we are not connected
      provider.connected
        ? provider.spaces?.map(spaceMenuItem(provider)) || []
        : [signInMenuItem(provider)],
    );
  });
});

const selectedText = computed(() => {
  return spacesDropdownData.value.find((item) => item.selected)?.text;
});

const spaceIcon = computed(() => {
  const activeSpaceInfo = store.getters["spaces/getSpaceInfo"](props.projectId);

  if (activeSpaceInfo?.local) {
    return ComputerDesktopIcon;
  }

  return activeSpaceInfo?.private ? PrivateSpaceIcon : CubeIcon;
});
</script>

<template>
  <div class="space-path-breadcrumb">
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
.space-path-breadcrumb {
  & .dropdown-icon {
    margin-left: 5px;

    &.flip {
      transform: scaleY(-1);
    }
  }

  & :deep(.menu-items) {
    max-height: 60vh;
    overflow-y: auto;
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
}
</style>
