<script setup lang="ts">
import ChatMessage from "./ChatMessage.vue";
import ChatControls from "./ChatControls.vue";
import { ref, watch, nextTick, computed } from "vue";
import { useStore } from "vuex";

const props = defineProps({
  chainType: {
    type: String,
    required: true,
    validator: (value: string) => ["qa", "build"].includes(value),
  },
  systemPrompt: {
    type: String,
    default: () => "",
  },
});

const messageArea = ref(null);

const store = useStore();
const messages = computed(
  () => store.state.aiAssistant[props.chainType].messages
);
const isProcessing = computed(
  () => store.state.aiAssistant[props.chainType].isProcessing
);
const statusUpdate = computed(
  () => store.state.aiAssistant[props.chainType].statusUpdate
);
const lastUserMessage = computed(() => {
  const messages = store.state.aiAssistant[props.chainType].messages;
  const lastUserMessage = messages.findLast(
    (message) => message.role === "user"
  );
  return lastUserMessage?.content ?? "";
});
const sendMessage = (message) => {
  store.dispatch("aiAssistant/makeAiRequest", {
    chainType: props.chainType,
    message,
  });
};

const abort = () => {
  if (
    confirm(
      "Are you sure you want to abort the request to the KNIME AI Assistant?"
    )
  ) {
    store.dispatch("aiAssistant/abortAiRequest", {
      chainType: props.chainType,
    });
  }
};

watch(
  () => messages.value,
  () => {
    nextTick(() => {
      messageArea.value.scrollTop = messageArea.value.scrollHeight;
    });
  },
  { deep: true }
);
</script>

<template>
  <div class="chat">
    <div ref="messageArea" class="message-area">
      <ChatMessage
        v-if="props.systemPrompt"
        key="system_prompt"
        role="assistant"
        :content="props.systemPrompt"
      />
      <ChatMessage
        v-for="(message, index) in messages"
        :key="index"
        v-bind="message"
      />
      <ChatMessage
        v-if="isProcessing"
        key="processing"
        role="assistant"
        :status-update="statusUpdate"
      />
    </div>
    <ChatControls
      class="chat-controls"
      :is-processing="isProcessing"
      :last-user-message="lastUserMessage"
      @send-message="sendMessage"
      @abort="abort"
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
