<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "@/composables/useStore";
import { SubMenu, ValueSwitch } from "@knime/components";
import type { MenuItem } from "@knime/components";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";
import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import Kai from "@/components/kai/Kai.vue";
import type { ChainType } from "@/components/kai/types";
import ChatPanel from "@/components/kai/chat/ChatPanel.vue";
import { useKaiPanels } from "@/components/kai/useKaiPanels";

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

const { component } = useKaiPanels();
const showChatControls = computed(() => component.value === ChatPanel);
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

    <Kai :mode="chainType" />
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.submenu {
  margin-left: 5px;
}
</style>
