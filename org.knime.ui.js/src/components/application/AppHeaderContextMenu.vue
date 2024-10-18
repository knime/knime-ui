<script setup lang="ts">
import { computed, watch } from "vue";
import { useRouter } from "vue-router";

import { type MenuItem, MenuItems } from "@knime/components";

import { API } from "@/api";
import type { SpaceItemReference, XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { TABS } from "@/store/panel";
import {
  findSpaceGroupFromSpaceId,
  isLocalProvider,
} from "@/store/spaces/util";

type Props = {
  projectId: string | null;
  position: XY | null;
};

const props = defineProps<Props>();

type AppHeaderContextMenuItem = MenuItem & {
  metadata?: { onClick: () => void };
};

const emit = defineEmits<{
  itemClick: [item: AppHeaderContextMenuItem];
}>();

const store = useStore();
const $toast = getToastsProvider();
const $router = useRouter();

const openProjects = computed(() => store.state.application.openProjects);
const activeProjectId = computed(() => store.state.application.activeProjectId);

const isUnknownProject = computed<(projectId: string) => boolean>(
  () => store.getters["application/isUnknownProject"],
);

const getAncestorItemIds = (
  origin: SpaceItemReference,
): Promise<Array<string> | null> => {
  const provider = store.state.spaces.spaceProviders?.[origin.providerId];
  if (!provider) {
    return Promise.resolve(null);
  }

  if (isLocalProvider(provider)) {
    return origin.ancestorItemIds
      ? Promise.resolve(origin.ancestorItemIds)
      : Promise.resolve(null);
  }

  // Throws error if the ancestor item IDs could not be retrieved
  return API.desktop.getAncestorItemIds({
    spaceProviderId: origin.providerId,
    spaceId: origin.spaceId,
    itemId: origin.itemId,
  });
};

const navigateToSpaceBrowsingPage = async (origin: SpaceItemReference) => {
  const group = findSpaceGroupFromSpaceId(
    store.state.spaces.spaceProviders ?? {},
    origin.spaceId,
  );

  store.commit("spaces/setCurrentSelectedItemIds", [origin.itemId]);

  await $router.push({
    name: APP_ROUTES.Home.SpaceBrowsingPage,
    params: {
      spaceProviderId: origin.providerId,
      spaceId: origin.spaceId,
      groupId: group?.id,
      itemId: origin.ancestorItemIds?.at(0) ?? "root",
    },
  });
};

const displaySpaceExplorerSidebar = async (origin: SpaceItemReference) => {
  if (!activeProjectId.value) {
    return;
  }

  if (
    store.state.panel.activeTab[activeProjectId.value] !== TABS.SPACE_EXPLORER
  ) {
    await store.dispatch(
      "panel/setCurrentProjectActiveTab",
      TABS.SPACE_EXPLORER,
    );
  }

  const { providerId, spaceId, itemId } = origin;
  const ancestorItemIds = await getAncestorItemIds(origin);

  const currentPath = store.state.spaces.projectPath[activeProjectId.value];
  const nextItemId = ancestorItemIds?.at(0) ?? "root";

  if (
    currentPath?.itemId !== nextItemId ||
    currentPath?.spaceId !== spaceId ||
    currentPath?.spaceProviderId !== providerId
  ) {
    store.commit("spaces/setProjectPath", {
      projectId: activeProjectId.value,
      value: {
        spaceId,
        spaceProviderId: providerId,
        itemId: nextItemId,
      },
    });
  }

  // To make sure it selects the item AFTER loading the content
  const unWatch = watch(
    () => store.state.spaces.isLoadingContent,
    (isLoading, wasLoading) => {
      if (wasLoading && !isLoading) {
        store.commit("spaces/setCurrentSelectedItemIds", [itemId]);
        unWatch();
      }
    },
  );
};

let previousToastId: string;

const showErrorToast = (message: string) => {
  store.commit("spaces/setCurrentSelectedItemIds", []);

  previousToastId = $toast.show({
    type: "error",
    headline: "Project not found",
    message,
    autoRemove: true,
  });
};

const contextMenuItems: AppHeaderContextMenuItem[] = [
  {
    text: "Reveal in space explorer",
    metadata: {
      onClick: async () => {
        try {
          const foundProject = openProjects.value.find(
            ({ projectId }) => projectId === props.projectId,
          );

          if (
            !foundProject?.origin ||
            isUnknownProject.value(foundProject.projectId)
          ) {
            showErrorToast("Could not reveal project in Space Explorer.");
            return;
          }

          // remove any "active" previous toast to avoid confusing the user
          $toast.remove(previousToastId);

          if (!activeProjectId.value) {
            await navigateToSpaceBrowsingPage(foundProject.origin);
            return;
          }

          await displaySpaceExplorerSidebar(foundProject.origin);
        } catch (error) {
          consola.error("Error revealing project in Space Explorer: ", error);
          showErrorToast(error as string);
        }
      },
    },
  },
  {
    text: "Close project",
    metadata: {
      onClick: () => {
        store.dispatch("workflow/closeProject", props.projectId);
      },
    },
  },
];

const onMenuItemClick = (item: AppHeaderContextMenuItem) => {
  if (!props.projectId) {
    return;
  }

  item.metadata.onClick();

  emit("itemClick", item);
};
</script>

<template>
  <MenuItems
    v-if="position"
    class="context-menu"
    menu-aria-label="Tab context menu"
    :items="contextMenuItems"
    @item-click="
      (_: MouseEvent, item: AppHeaderContextMenuItem) => onMenuItemClick(item)
    "
  />
</template>

<style lang="postcss" scoped>
.context-menu {
  position: absolute;
}
</style>
