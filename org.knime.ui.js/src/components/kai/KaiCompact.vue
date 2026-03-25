<script setup lang="ts">
import { storeToRefs } from "pinia";

import XCloseIcon from "@knime/styles/img/icons/close.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { usePanelStore } from "@/store/panel";
import { useAnalytics } from "@/services/analytics";

import ChatControls from "./chat/ChatControls.vue";
import Message from "./chat/message/Message.vue";
import { useChat } from "./chat/useChat";
import { useKaiPanels } from "./panels/useKaiPanels";

const emit = defineEmits<{ close: [] }>();

const {
  isProcessing,
  incomingTokens,
  statusUpdate,
  lastAiMessage,
  lastUserMessage,
  sendMessage,
  abortSendMessage,
} = useChat("qa");

const { usage } = storeToRefs(useAIAssistantStore());

const { panelComponent } = useKaiPanels();

const onSendMessage = (...args: Parameters<typeof sendMessage>) => {
  sendMessage(...args);
  useAnalytics().track("kai_prompted::kaiqa_button_prompt");
};
</script>

<template>
  <div class="kai-compact">
    <!-- Close button — top-right corner -->
    <button
      class="close-btn"
      title="Close K-AI"
      aria-label="Close K-AI"
      @click="emit('close')"
    >
      <XCloseIcon aria-hidden="true" focusable="false" />
    </button>

    <!-- Auth / disclaimer panels replace the normal UI -->
    <component :is="panelComponent" v-if="panelComponent" class="panel-container" />

    <template v-else>
      <!-- Last AI answer (or streaming answer while processing) -->
      <div v-if="lastAiMessage || isProcessing" class="last-answer">
        <Message
          :role="KaiMessage.RoleEnum.Assistant"
          :content="isProcessing ? incomingTokens : lastAiMessage!.content"
          :status-update="isProcessing ? statusUpdate : null"
          :nodes="lastAiMessage?.nodes"
          :references="lastAiMessage?.references"
          :is-error="lastAiMessage?.isError"
        />
      </div>

      <!-- Input field -->
      <ChatControls
        :is-processing="isProcessing"
        :last-user-message="lastUserMessage"
        :usage="usage"
        placeholder="Ask K-AI…"
        @send-message="onSendMessage"
        @abort="abortSendMessage"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.kai-compact {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 8px 2px;
}

.close-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background-color: var(--kds-color-surface-default);
  border: 1px solid rgb(26 26 26 / 30%);
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: var(--kds-color-background-primary-hover);
  }

  & svg {
    width: 12px;
    height: 12px;
    stroke: var(--kds-color-text-and-icon-neutral);
    stroke-width: 2px;
  }
}

.last-answer {
  max-height: 260px;
  overflow-y: auto;
}

.panel-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
