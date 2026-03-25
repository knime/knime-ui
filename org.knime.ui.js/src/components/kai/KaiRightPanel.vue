<script setup lang="ts">
import { computed } from "vue";

import { SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import ShieldCloseIcon from "@knime/styles/img/icons/shield-close.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { useAISettingsStore } from "@/store/ai/aiSettings";
import { usePanelStore } from "@/store/panel";

import KaiExtensionPanel from "./KaiExtensionPanel.vue";
import Chat from "./chat/Chat.vue";
import { useKaiPanels } from "./panels/useKaiPanels";

const panelStore = usePanelStore();
const { clearConversation } = useAIAssistantStore();
const { revokePermissionsForAllActionsForActiveProject } = useAISettingsStore();

const deleteChatMenuItem = {
  text: "Clear chat",
  icon: TrashIcon,
  metadata: {
    handler: () => clearConversation({ chainType: "qa" }),
  },
};

const resetPermissionsMenuItem = {
  text: "Reset permissions for this workflow",
  icon: ShieldCloseIcon,
  metadata: {
    handler: () => revokePermissionsForAllActionsForActiveProject(),
  },
};

type MenuItemWithHandler = MenuItem<{ handler?: () => void }>;

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  (item as MenuItemWithHandler).metadata?.handler?.();

const closeKai = () => {
  panelStore.closeKaiCompact();
};

const { panelComponent } = useKaiPanels();
const showChatControls = computed(() => !panelComponent.value);
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>KNIME AI Assistant</h2>
      <template v-if="showChatControls">
        <SubMenu
          orientation="left"
          class="submenu"
          :items="[deleteChatMenuItem, resetPermissionsMenuItem]"
          @item-click="onItemClick"
        >
          <MenuIcon />
        </SubMenu>
      </template>
      <button class="close-btn" type="button" @click="closeKai">
        Close
      </button>
    </template>

    <div v-if="panelComponent" class="panel-container">
      <component :is="panelComponent" />
    </div>
    <template v-else>
      <Chat chain-type="qa" />
      <KaiExtensionPanel />
    </template>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.submenu {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  margin-left: 5px;
}

.panel-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--kds-color-text-and-icon-neutral-faint);
  cursor: pointer;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;

  &:hover {
    color: var(--kds-color-text-and-icon-neutral);
    background-color: var(--kds-color-background-neutral-hover);
  }
}

.close-btn {
  margin-left: 4px;
}
</style>
