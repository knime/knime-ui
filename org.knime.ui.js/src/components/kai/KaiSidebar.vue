<script setup lang="ts">
import { computed, ref } from "vue";

import { SubMenu } from "@knime/components";
import type { MenuItem } from "@knime/components";
import { KdsValueSwitch } from "@knime/kds-components";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import type { ChainType } from "@/store/ai/types";

import KaiExtensionPanel from "./KaiExtensionPanel.vue";
import Chat from "./chat/Chat.vue";
import { useKaiPanels } from "./panels/useKaiPanels";

const chainType = ref<ChainType>("qa");

const { clearConversation } = useAIAssistantStore();

const deleteChatMenuItem = {
  text: "Clear chat",
  icon: TrashIcon,
  metadata: {
    handler: () => clearConversation({ chainType: chainType.value }),
  },
};

type MenuItemWithHandler = MenuItem<{ handler?: () => void }>;

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  (item as MenuItemWithHandler).metadata?.handler?.();

const { panelComponent } = useKaiPanels();
const showChatControls = computed(() => !panelComponent.value);
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>KNIME AI Assistant</h2>
      <template v-if="showChatControls">
        <KdsValueSwitch
          v-model="chainType"
          size="small"
          :possible-values="[
            { id: 'qa', text: 'Q&A' },
            { id: 'build', text: 'Build' },
          ]"
        />
        <SubMenu
          orientation="left"
          class="submenu"
          :items="[deleteChatMenuItem]"
          @item-click="onItemClick"
        >
          <MenuIcon />
        </SubMenu>
      </template>
    </template>

    <div v-if="panelComponent" class="panel-container">
      <component :is="panelComponent" />
    </div>
    <template v-else>
      <Chat v-if="chainType === 'qa'" chain-type="qa" />
      <Chat v-if="chainType === 'build'" chain-type="build" />
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
</style>
