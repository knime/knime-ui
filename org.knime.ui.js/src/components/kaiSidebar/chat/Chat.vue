<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import Message from "./message/Message.vue";
import MessageSeparatorComponent from "./MessageSeparator.vue";
import ChatControls from "./ChatControls.vue";
import { useChat, MessageSeparator } from "./useChat";
import type { ChainType } from "../types";

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

const scrollableContainer = ref<HTMLElement | null>(null);

const scrollToBottomAfterNextTick = () => {
  nextTick(() => {
    if (scrollableContainer.value) {
      scrollableContainer.value.scrollTop =
        scrollableContainer.value.scrollHeight;
    }
  });
};

watch(() => incomingTokens.value, scrollToBottomAfterNextTick);
watch(() => messagesWithSeparators.value, scrollToBottomAfterNextTick, {
  deep: true,
});
</script>

<template>
  <div class="chat">
    <div ref="scrollableContainer" class="scrollable-container">
      <div class="message-area">
        <template v-for="(item, index) in messagesWithSeparators" :key="index">
          <MessageSeparatorComponent
            v-if="item instanceof MessageSeparator"
            v-bind="item"
          />
          <Message
            v-else
            v-bind="item"
            @node-templates-loaded="scrollToBottomAfterNextTick"
          />
        </template>
        <Message
          v-if="isProcessing"
          key="processing"
          role="assistant"
          :content="incomingTokens"
          :status-update="statusUpdate ?? ''"
        />
      </div>
    </div>
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

  & .scrollable-container {
    width: calc(100% + 20px);
    flex: 1;
    overflow: hidden auto;

    & .message-area {
      width: calc(100% - 20px);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  & .chat-controls {
    max-height: 200px;
    min-height: 50px;
  }
}
</style>
