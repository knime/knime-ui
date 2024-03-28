<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

import MenuItems, {
  type MenuItem,
} from "webapps-common/ui/components/MenuItems.vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";
import { globalSpaceBrowserProjectId } from "@/store/spaces";
import { APP_ROUTES } from "@/router/appRoutes";

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

let previousToastId: string;

const contextMenuItems: AppHeaderContextMenuItem[] = [
  {
    text: "Reveal in Space Explorer",
    metadata: {
      onClick: async () => {
        const showError = () => {
          store.commit("spaces/setCurrentSelectedItemIds", []);

          previousToastId = $toast.show({
            type: "error",
            headline: "Project not found",
            message: "Could not reveal project in Space Explorer.",
            autoRemove: true,
          });
        };

        try {
          const foundProject = openProjects.value.find(
            ({ projectId }) => projectId === props.projectId,
          );

          if (
            !foundProject ||
            !foundProject.origin ||
            isUnknownProject.value(foundProject.projectId)
          ) {
            showError();

            return;
          }

          // remove any "active" previous toast to avoid confusing the user
          $toast.remove(previousToastId);

          const { spaceId, providerId, itemId, ancestorItemIds } =
            foundProject.origin;

          // if we have no active project then we're on the home page, which means
          // we reveal the project in the SpaceBrowsingPage instead
          const projectPathToReload =
            activeProjectId.value ?? globalSpaceBrowserProjectId;

          if (activeProjectId.value) {
            await store.dispatch(
              "panel/setCurrentProjectActiveTab",
              TABS.SPACE_EXPLORER,
            );
          } else {
            $router.push({ name: APP_ROUTES.SpaceBrowsingPage });
          }

          store.commit("spaces/setProjectPath", {
            projectId: projectPathToReload,
            value: {
              spaceId,
              spaceProviderId: providerId,
              itemId: ancestorItemIds?.at(0) ?? "root",
            },
          });

          await store.dispatch("spaces/fetchWorkflowGroupContent", {
            projectId: projectPathToReload,
          });

          store.commit("spaces/setCurrentSelectedItemIds", [itemId]);
        } catch (error) {
          consola.error("Error revealing project in Space Explorer", error);
          showError();
        }
      },
    },
  },
  {
    text: "Close Project",
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
    @item-click="(_, item) => onMenuItemClick(item)"
  />
</template>

<style lang="postcss" scoped>
.context-menu {
  position: absolute;
}
</style>
