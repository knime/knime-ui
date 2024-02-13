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

interface Props {
  showText?: boolean;
  projectId: string | null;
}

const store = useStore();
const props = withDefaults(defineProps<Props>(), { showText: true });

type ProviderMetadata = { active: boolean };
type SpaceMetadata = {
  id: string;
  spaceId?: string;
  spaceProviderId?: string;
  requestSignIn?: boolean;
  space?: SpaceProviderNS.Space;
};

type MenuItemWithMetadata<T> = Omit<MenuItem, "metadata"> & {
  metadata?: T;
};

const isProviderMetadata = (
  metadata: ProviderMetadata | SpaceMetadata,
): metadata is ProviderMetadata => {
  return "active" in metadata;
};

const onSpaceChange = async ({
  metadata,
}: MenuItemWithMetadata<SpaceMetadata>) => {
  const { projectId } = props;

  const { spaceId, spaceProviderId, requestSignIn = false } = metadata;

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

const activeSpacePath = computed(
  () => store.state.spaces.projectPath[props.projectId],
);
const spaceProviders = computed(() => store.state.spaces.spaceProviders);

const createProviderHeadlineMenuItem = (
  provider: SpaceProviderNS.SpaceProvider,
): [MenuItemWithMetadata<SpaceMetadata>?] => {
  return provider.type === SpaceProviderNS.TypeEnum.LOCAL
    ? []
    : [
        {
          text: provider.name,
          selected: false,
          sectionHeadline: true,
          separator: true,
          metadata: {
            id: provider.id,
          },
        },
      ];
};

const createSpaceMenuItem = (
  provider: SpaceProviderNS.SpaceProvider,
  space: SpaceProviderNS.Space,
): MenuItemWithMetadata<SpaceMetadata> => ({
  text: space.name,

  selected:
    provider.id === activeSpacePath.value?.spaceProviderId &&
    space.id === activeSpacePath.value?.spaceId,

  icon: space.private ? PrivateSpaceIcon : CubeIcon,

  sectionHeadline: false,
  separator: false,
  metadata: {
    id: `${provider.id}__${space.id}`,
    spaceId: space.id,
    spaceProviderId: provider.id,
    requestSignIn: false,
    space,
  },
});

const createSignInMenuItem = (
  provider: SpaceProviderNS.SpaceProvider,
): MenuItemWithMetadata<SpaceMetadata> => ({
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

const groupSpacesByOwner = (
  provider: SpaceProviderNS.SpaceProvider,
  spaces: SpaceProviderNS.Space[],
) => {
  return spaces.reduce<Record<string, MenuItemWithMetadata<SpaceMetadata>[]>>(
    (groups, space) => {
      groups[space.owner] = (groups[space.owner] ?? []).concat(
        createSpaceMenuItem(provider, space),
      );
      return groups;
    },
    {},
  );
};

const mapGroupsToMenuItems = (groups: {
  provider: SpaceProviderNS.SpaceProvider;
  spaces: ReturnType<typeof groupSpacesByOwner>;
}): MenuItemWithMetadata<ProviderMetadata | SpaceMetadata>[] => {
  const { spaces, provider } = groups;
  const groupNames = Object.keys(spaces);

  // local and server always have a single space, so no need to show a nested menu
  const shouldHaveChildren = (provider: SpaceProviderNS.SpaceProvider) =>
    provider.type === SpaceProviderNS.TypeEnum.HUB;

  const getIcon = (
    provider: SpaceProviderNS.SpaceProvider,
    space: SpaceProviderNS.Space,
  ) => {
    if (provider.type !== SpaceProviderNS.TypeEnum.HUB) {
      return null;
    }

    return space.private ? PrivateSpaceIcon : CubeIcon;
  };

  return groupNames.map((groupName) => {
    const isActiveProvider =
      provider.id === activeSpacePath.value?.spaceProviderId;

    if (shouldHaveChildren(provider)) {
      const containsActiveSpace = spaces[groupName].find(
        (item) => item.metadata.space.id === activeSpacePath.value?.spaceId,
      );

      return {
        text: groupName,
        children: spaces[groupName],
        // cannot use the `selected` property because this is a parent item (which spawns  a submenu)
        // and the `selected` property on these type of items messes up the styles (hover, focused, etc)
        metadata: { active: Boolean(containsActiveSpace) },
      };
    }

    const space = spaces[groupName].at(0).metadata.space;

    return {
      text: space.name,
      selected: isActiveProvider,
      icon: getIcon(provider, space),
      metadata: {
        id: `${provider.id}__${space.id}`,
        spaceId: space.id,
        spaceProviderId: provider.id,
      },
    };
  });
};

const spacesDropdownData = computed(
  (): Array<MenuItemWithMetadata<ProviderMetadata | SpaceMetadata>> => {
    if (store.state.spaces.isLoadingProvider) {
      // @ts-ignore
      return [{ text: "Loading…", disabled: true, icon: LoadingIcon }];
    }

    const providers = spaceProviders.value
      ? Object.values(spaceProviders.value)
      : [];

    const groupedByOwner = providers.map((provider) =>
      provider.spaces
        ? { provider, spaces: groupSpacesByOwner(provider, provider.spaces) }
        : { provider, spaces: {} },
    );

    return groupedByOwner.flatMap(({ provider, spaces }) => {
      const withHeadline = createProviderHeadlineMenuItem(provider);

      const items = mapGroupsToMenuItems({ provider, spaces });

      return (
        []
          .concat(withHeadline)
          // only add sign-in option for disconnected providers
          .concat(provider.connected ? items : [createSignInMenuItem(provider)])
      );
    });
  },
);

const selectedText = computed(() => {
  const selectedRootItem = spacesDropdownData.value.find((item) =>
    item.metadata && isProviderMetadata(item.metadata)
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

  if (!selectedChildItem) {
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
    & .list-item:not(.section-headline) {
      padding-left: 28px;
    }

    & li:first-of-type .list-item {
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
