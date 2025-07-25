<script setup lang="ts">
import { computed, toRef } from "vue";

import { type MenuItem, MenuItems } from "@knime/components";

import type { XY } from "@/api/gateway-api/generated-api";
import type { MenuItemWithHandler } from "@/components/common/types";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";

import { useRevealProject } from "./useRevealProject";

type Props = {
  projectId: string;
  position: XY | null;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  itemClick: [item: MenuItemWithHandler];
}>();

const { revealProjectMenuOption } = useRevealProject({
  projectId: toRef(props, "projectId"),
});

const contextMenuItems = computed(() => [
  ...revealProjectMenuOption.value,
  {
    text: "Close",
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
