<script lang="ts" setup>
import SubMenu from "webapps-common/ui/components/SubMenu.vue";

import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PrivateSpaceIcon from "webapps-common/ui/assets/img/icons/private-space.svg";
import ComputerDesktopIcon from "@/assets/computer-desktop.svg";

import { useStore } from "vuex";
import { computed } from "vue";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import type { RootStoreState } from "@/store/types";

interface Props {
  showText?: boolean;
  projectId: string | null;
}

const store = useStore<RootStoreState>();
const props = withDefaults(defineProps<Props>(), { showText: true });

const onSpaceChange = async ({
  data: { spaceId, spaceProviderId, requestSignIn = false },
}) => {
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
  const activeSpacePath = store.state.spaces.projectPath[props.projectId];
  const spaceProviders = store.state.spaces.spaceProviders;

  const providers = spaceProviders ? Object.values(spaceProviders) : [];

  return providers.flatMap((provider) =>
    (provider.id === "local"
      ? []
      : [
          {
            id: provider.id,
            text: provider.name,
            sectionHeadline: true,
            separator: true,
          },
        ]
    ).concat(
      provider.spaces
        ? provider.spaces.map((space) => ({
            text: space.name,
            id: `${provider.id}__${space.id}`,
            selected: space.id === activeSpacePath?.spaceId,
            sectionHeadline: false,
            separator: false,
            data: {
              spaceId: space.id,
              spaceProviderId: provider.id,
              requestSignIn: false,
            },
          }))
        : [
            {
              text: "Sign in",
              id: `${provider.id}__SIGN_IN`,
              sectionHeadline: false,
              selected: false,
              separator: false,
              data: {
                spaceId: null,
                spaceProviderId: provider.id,
                requestSignIn: true,
              },
            },
          ]
    )
  );
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
      :items="spacesDropdownData"
      class="submenu"
      button-title="Change space"
      orientation="left"
      @item-click="(e, item) => onSpaceChange(item)"
    >
      <template v-if="showText">
        <Component :is="spaceIcon" />
        <span class="selected-text">{{ selectedText }}</span>
      </template>
      <DropdownIcon class="dropdown-icon" />
    </SubMenu>
  </div>
</template>

<style lang="postcss">
.space-path-breadcrumb {
  & .dropdown-icon {
    margin-left: 5px;
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
