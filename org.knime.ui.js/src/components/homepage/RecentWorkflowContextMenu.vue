<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { type Anchor, type MenuItem, MenuItems } from "@knime/components";

import type { RecentWorkflow } from "@/api/custom-types";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { optional } from "@/lib/fp";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import type { MenuItemWithHandler } from "../common/types";

interface Props {
  anchor: Anchor;
  onItemClick: (item: MenuItem) => void;
  closeContextMenu: () => void;
}

const props = defineProps<Props>();
const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
const { revealSingleItem, canRevealItem, revealActionMetadata } =
  useRevealInSpaceExplorer();

const handleItemClick = (item: MenuItemWithHandler) => {
  if (item.metadata?.handler) {
    item.metadata.handler();
    props.closeContextMenu();
    return;
  }
  props.onItemClick(item);
};

const recentWorkflowContextMenuItems = computed(() => {
  const recentWorkflow = props.anchor.item.meta!
    .recentWorkflow as RecentWorkflow;

  const provider = spaceProviders.value?.[recentWorkflow.origin.providerId];
  const isConnected = provider?.connected;

  const revealInSpaceOption: MenuItemWithHandler = {
    text: isConnected
      ? revealActionMetadata.label
      : "Connect and reveal in space explorer",
    icon: revealActionMetadata.icon,
    metadata: {
      id: "revealInSpaceExplorer",
      handler: async () => {
        await revealSingleItem(recentWorkflow.origin, recentWorkflow.name);
      },
    },
  };

  const menuItems: Array<MenuItem> = [
    ...optional(
      canRevealItem(recentWorkflow.origin?.providerId),
      revealInSpaceOption,
    ),
  ] as MenuItemWithHandler[];

  return menuItems;
});
</script>

<template>
  <MenuItems
    id="recent-workflow-context-menu"
    :items="recentWorkflowContextMenuItems"
    class="menu-items"
    register-keydown
    menu-aria-label="Recent Workflow Context Menu"
    @item-click="(_, item) => handleItemClick(item as MenuItemWithHandler)"
    @close="closeContextMenu"
  />
</template>
