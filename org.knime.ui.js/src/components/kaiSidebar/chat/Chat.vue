<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import Message from "./message/Message.vue";
import ChatControls from "./ChatControls.vue";
import useKaiServer from "../useKaiServer";
import useChat from "./useChat";
import type { ChainType } from "../types";

interface Props {
  chainType: ChainType;
}

const props = defineProps<Props>();

const { uiStrings } = useKaiServer();
const systemPrompt = computed(() => uiStrings.welcome_message[props.chainType]);

const {
  messages,
  isProcessing,
  incomingTokens,
  statusUpdate,
  lastUserMessage,
  sendMessage,
  abortSendMessage,
} = useChat(props.chainType);

const messageArea = ref(null);

const scrollToBottomAfterNextTick = () => {
  nextTick(() => {
    messageArea.value.scrollTop = messageArea.value.scrollHeight;
  });
};
watch(() => incomingTokens.value, scrollToBottomAfterNextTick);
watch(() => messages.value, scrollToBottomAfterNextTick, { deep: true });
</script>

<template>
  <div class="chat">
    <div ref="messageArea" class="message-area">
      <Message
        v-if="systemPrompt"
        key="system_prompt"
        role="assistant"
        :content="systemPrompt"
      />
      <Message
        v-for="(message, index) in messages"
        :key="index"
        v-bind="message"
        @node-templates-loaded="scrollToBottomAfterNextTick"
      />
      <Message
        v-if="isProcessing"
        key="processing"
        role="assistant"
        :content="incomingTokens"
        :status-update="statusUpdate"
      />
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

  & .message-area {
    width: 100%;
    padding-bottom: 20px;
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
  }

  & .chat-controls {
    max-height: 200px;
    min-height: 50px;
  }
}
</style>
