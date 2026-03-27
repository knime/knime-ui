<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton, Pill, SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import ShieldCloseIcon from "@knime/styles/img/icons/shield-close.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { useAISettingsStore } from "@/store/ai/aiSettings";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

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

const { getSelectedNodes, getSelectedAnnotations } = storeToRefs(useSelectionStore());
const nodeInteractionsStore = useNodeInteractionsStore();

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const CHIP_MAX = 24;
const truncate = (s: string) => (s.length > CHIP_MAX ? `${s.slice(0, CHIP_MAX)}…` : s);

const selectionChips = computed(() => [
  ...getSelectedNodes.value.map((n) => ({
    key: `node-${n.id}`,
    label: truncate(nodeInteractionsStore.getNodeName(n.id)),
  })),
  ...getSelectedAnnotations.value.map((a) => ({
    key: `ann-${a.id}`,
    label: truncate(stripHtml(a.text.value)) || "Annotation",
  })),
]);
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
      <FunctionButton compact title="Close" @click="closeKai">
        <CloseIcon />
      </FunctionButton>
    </template>

    <div v-if="panelComponent" class="panel-container">
      <component :is="panelComponent" />
    </div>
    <template v-else>
      <Chat chain-type="qa">
        <template v-if="selectionChips.length" #before-controls>
          <div class="selection-chips">
            <Pill
              v-for="chip in selectionChips"
              :key="chip.key"
              color="gray"
              :title="chip.label"
            >{{ chip.label }}</Pill>
          </div>
        </template>
      </Chat>
      <KaiExtensionPanel />
    </template>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.submenu {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  margin-left: 5px;
}

.selection-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 12px 8px;
  border-top: 1px solid var(--kds-color-border-default, var(--knime-silver-sand));
}

.panel-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

</style>
