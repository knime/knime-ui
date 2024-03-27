<script setup lang="ts">
import { computed } from "vue";

import MenuItems, {
  type MenuItem,
} from "webapps-common/ui/components/MenuItems.vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";

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

const openProjects = computed(() => store.state.application.openProjects);

const isUnknownProject = computed<(projectId: string) => boolean>(
  () => store.getters["application/isUnknownProject"],
);

const contextMenuItems: AppHeaderContextMenuItem[] = [
  {
    text: "Reveal in Space Explorer",
    metadata: {
      onClick: async () => {
        const showError = () => {
          store.commit("spaces/setCurrentSelectedItemIds", []);

          $toast.show({
            type: "error",
            headline: "Project not found",
            message: "Could not reveal project in Space Explorer.",
            autoRemove: true,
          });
        };

        try {
          const project = openProjects.value.find(
            ({ projectId }) => projectId === props.projectId,
          );

          if (
            !project ||
            !project.origin ||
            isUnknownProject.value(project.projectId)
          ) {
            showError();

            return;
          }

          const { spaceId, providerId, itemId, ancestorItemIds } =
            project.origin;

          store.commit("spaces/setProjectPath", {
            projectId: props.projectId,
            value: {
              spaceId,
              spaceProviderId: providerId,
              itemId: ancestorItemIds?.length === 0 ? "root" : itemId,
            },
          });

          await store.dispatch(
            "panel/setCurrentProjectActiveTab",
            TABS.SPACE_EXPLORER,
          );

          await store.dispatch("spaces/fetchWorkflowGroupContent", {
            projectId: props.projectId,
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
