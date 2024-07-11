<script setup lang="ts">
import { ref } from "vue";
import { SubMenu, ValueSwitch } from "@knime/components";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";
import type { MenuItem } from "@knime/components";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import { useStore } from "@/composables/useStore";

import Chat from "./chat/Chat.vue";
import type { ChainType } from "./types";
import NodeDescriptionPortal from "./NodeDescriptionPortal.vue";

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
const onItemClick = (_: any, item: MenuItem) => item.metadata?.handler?.();
</script>

<template>
  <SidebarPanelLayout class="chat-panel">
    <template #header>
      <h2>KNIME AI Assistant</h2>
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

    <Chat v-show="chainType === 'qa'" chain-type="qa" />
    <Chat v-show="chainType === 'build'" chain-type="build" />
    <NodeDescriptionPortal />
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.chat-panel {
  & .submenu {
    margin-left: 5px;
  }
}
</style>
