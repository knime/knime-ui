<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { type MenuItem, MenuItems } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import RevealInSpaceIcon from "@knime/styles/img/icons/eye.svg";

import type { XY } from "@/api/gateway-api/generated-api";
import type { MenuItemWithHandler } from "@/components/common/types";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useApplicationStore } from "@/store/application/application";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { valueOrEmpty } from "@/util/valueOrEmpty";

type Props = {
  projectId: string;
  position: XY | null;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  itemClick: [item: MenuItemWithHandler];
}>();

const { canRevealItem, revealSingleItem } = useRevealInSpaceExplorer();
const { openProjects, isUnknownProject } = storeToRefs(useApplicationStore());

const canRevealProject = computed(() => {
  const foundProject = openProjects.value.find(
    ({ projectId }) => projectId === props.projectId,
  );

  // cannot reveal unknown projects (aka no origin, or not related to our current providers)
  if (!foundProject || isUnknownProject.value(foundProject.projectId)) {
    return false;
  }

  return canRevealItem(foundProject.origin!.providerId);
});

const contextMenuItems = computed(() => [
  ...valueOrEmpty(canRevealProject.value, {
    text: "Reveal in space explorer",
    icon: RevealInSpaceIcon,
    metadata: {
      handler: async () => {
        if (!props.projectId) {
          consola.error("Unexpected error. Project ID not provided");
          return;
        }

        const foundProject = openProjects.value.find(
          ({ projectId }) => projectId === props.projectId,
        );

        if (
          !foundProject?.origin ||
          isUnknownProject.value(foundProject.projectId)
        ) {
          consola.error("Reveal project option not supported", {
            foundProject,
          });
          return;
        }

        await revealSingleItem(foundProject.origin, foundProject.name);
      },
    },
  }),
  {
    text: "Close",
    icon: CloseIcon,
    metadata: {
      handler: () => {
        useDesktopInteractionsStore().closeProject(props.projectId);
      },
    },
  } satisfies MenuItemWithHandler,
]);

const onMenuItemClick = (item: MenuItem) => {
  if (!props.projectId) {
    return;
  }

  const contextMenuItem = item as MenuItemWithHandler;
  contextMenuItem.metadata!.handler?.();

  emit("itemClick", contextMenuItem);
};
</script>

<template>
  <MenuItems
    v-if="position"
    class="context-menu"
    menu-aria-label="Tab context menu"
    :items="contextMenuItems"
    @item-click="(_: MouseEvent, item: MenuItem) => onMenuItemClick(item)"
  />
</template>

<style lang="postcss" scoped>
.context-menu {
  position: absolute;
}
</style>
