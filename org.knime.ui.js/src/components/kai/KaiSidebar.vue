<script setup lang="ts">
import { computed, ref } from "vue";

import { SubMenu, ValueSwitch } from "@knime/components";
import type { MenuItem } from "@knime/components";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import { useStore } from "@/composables/useStore";

import KaiExtensionPanel from "./KaiExtensionPanel.vue";
import Chat from "./chat/Chat.vue";
import { useKaiPanels } from "./panels/useKaiPanels";
import type { ChainType } from "./types";

const chainType = ref<ChainType>("qa");

const store = useStore();

const deleteChatMenuItem = {
  text: "Clear chat",
  icon: TrashIcon,
  metadata: {
    handler: () =>
      store.dispatch("aiAssistant/clearConversation", {
        chainType: chainType.value,
      }),
  },
};
const onItemClick = (_: MouseEvent, item: MenuItem) =>
  item.metadata?.handler?.();

const { panelComponent } = useKaiPanels();
const showChatControls = computed(() => !panelComponent.value);
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <h2>KNIME AI Assistant</h2>
      <template v-if="showChatControls">
        <ValueSwitch
          v-model="chainType"
          compact
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

    <component :is="panelComponent" v-if="panelComponent" />
    <template v-else>
      <Chat v-show="chainType === 'qa'" chain-type="qa" />
      <Chat v-show="chainType === 'build'" chain-type="build" />
      <KaiExtensionPanel />
    </template>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.submenu {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  margin-left: 5px;
}
</style>
