<script setup lang="ts">
import { ref } from "vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import MenuIcon from "webapps-common/ui/assets/img/icons/menu-options.svg";
import TrashIcon from "webapps-common/ui/assets/img/icons/trash.svg";
import ValueSwitch from "webapps-common/ui/components/forms/ValueSwitch.vue";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import { useStore } from "@/composables/useStore";
import Chat from "./chat/Chat.vue";
import BasePanel from "./BasePanel.vue";
import type { ChainType } from "./types";
import NodeDescriptionPortal from "./NodeDescriptionPortal.vue";

const chainType = ref<ChainType>("qa");

const store = useStore();

const deleteChatMenuItem = {
  text: "Delete chat history",
  icon: TrashIcon,
  metadata: {
    handler: () =>
      store.dispatch("chat/clearConversationAndPersistState", {
        chainType: chainType.value,
      }),
  },
};
const onItemClick = (_: any, item: MenuItem) => item.metadata?.handler?.();
</script>

<template>
  <BasePanel class="chat-panel">
    <template #headerControls>
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
  </BasePanel>
</template>

<style lang="postcss" scoped>
.chat-panel {
  & .submenu {
    margin-left: 5px;
  }
}
</style>
