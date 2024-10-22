<script setup lang="ts">
import { toRef } from "vue";

import { type MenuItem, MenuItems } from "@knime/components";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

import { useRevealProject } from "./useRevealProject";

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

const { revealProjectMenuOption } = useRevealProject({
  projectId: toRef(props, "projectId"),
});

const contextMenuItems: AppHeaderContextMenuItem[] = [
  ...revealProjectMenuOption,
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
