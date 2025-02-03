<script setup lang="ts">
import { ref, watch } from "vue";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import type { ChainType } from "../types";

import ChatControls from "./ChatControls.vue";
import MessageSeparatorComponent from "./MessageSeparator.vue";
import Message from "./message/Message.vue";
import { MessageSeparator, useChat } from "./useChat";

interface Props {
  chainType: ChainType;
}

const props = defineProps<Props>();

const {
  messagesWithSeparators,
  isProcessing,
  incomingTokens,
  statusUpdate,
  lastUserMessage,
  sendMessage,
  abortSendMessage,
} = useChat(props.chainType);

const scrollableContainer =
  ref<InstanceType<typeof SidebarPanelScrollContainer>>();

const scrollOnNewMessages = () => {
  if (scrollableContainer.value) {
    scrollableContainer.value.scrollToBottom();
  }
};

watch(() => incomingTokens.value, scrollOnNewMessages);
watch(
  messagesWithSeparators,
  (newValue, oldValue) => {
    if (newValue.length > oldValue.length) {
      scrollOnNewMessages();
    }
  },
  {
    deep: true,
  },
);
</script>

<template>
  <div class="chat">
    <SidebarPanelScrollContainer ref="scrollableContainer">
      <div class="messages">
        <template v-for="(item, index) in messagesWithSeparators" :key="index">
          <MessageSeparatorComponent
            v-if="item instanceof MessageSeparator"
            v-bind="item"
          />
          <Message
            v-else
            v-bind="item"
            @node-templates-loaded="scrollOnNewMessages"
          />
      </template>
      <Message
        v-if="isProcessing"
        key="processing"
        :role="KaiMessage.RoleEnum.Assistant"
        :content="incomingTokens"
        :status-update="statusUpdate"
      />
      </div>
    </SidebarPanelScrollContainer>

    <ChatControls
      class="chat-controls"
      :is-processing="isProcessing"
      :last-user-message="lastUserMessage"
      @send-message="sendMessage"
      @abort="abortSendMessage"
    />
  </div>
</template>

<style lang="postcss" scoped>
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;

  & .messages {
    padding-top: 20px;
    padding-bottom: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  & .chat-controls {
    max-height: 200px;
    min-height: 50px;
  }
}
</style>
