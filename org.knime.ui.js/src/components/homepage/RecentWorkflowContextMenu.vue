<script lang="ts" setup>
import { computed } from "vue";

import {
  type FileExplorerContextMenu,
  type MenuItem,
  MenuItems,
} from "@knime/components";
import RevealInSpaceIcon from "@knime/styles/img/icons/eye.svg";

import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
import { useStore } from "@/composables/useStore";

export type ActionMenuItem = MenuItem & {
  id: string;
  execute: (() => void) | null;
};

interface Props {
  anchor: FileExplorerContextMenu.Anchor;
  onItemClick: (item: MenuItem) => void;
  closeContextMenu: () => void;
}

const props = defineProps<Props>();
const store = useStore();
const { revealInSpaceExplorer, canRevealItem } = useRevealInSpaceExplorer();

const handleItemClick = (item: MenuItem & { execute?: () => void }) => {
  if (item.execute) {
    item.execute();
    props.closeContextMenu();
    return;
  }
  props.onItemClick(item);
};

const valueOrEmpty = <T,>(condition: boolean, value: T) =>
  condition ? [value] : [];

const recentWorkflowContextMenuItems = computed(() => {
  const recentWorkflow = props.anchor.item.meta?.recentWorkflow;
  const provider =
    store.state.spaces.spaceProviders?.[recentWorkflow.origin.providerId];
  const isConnected = provider?.connected;

  const revealInSpaceOption: ActionMenuItem = {
    id: "revealInSpaceExplorer",
    text: isConnected ? "Show in explorer" : "Connect and show in explorer",
    icon: RevealInSpaceIcon,
    execute: async () => {
      await revealInSpaceExplorer(recentWorkflow.origin, recentWorkflow.name);
    },
  };

  const menuItems: Array<MenuItem> = [
    ...valueOrEmpty(canRevealItem(recentWorkflow.origin), revealInSpaceOption),
  ] as ActionMenuItem[];

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
    @item-click="(_, item) => handleItemClick(item)"
    @close="closeContextMenu"
  />
</template>
