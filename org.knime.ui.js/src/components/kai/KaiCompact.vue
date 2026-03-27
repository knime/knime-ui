<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Pill } from "@knime/components";
import XCloseIcon from "@knime/styles/img/icons/close.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import { usePanelStore } from "@/store/panel";
import { useAnalytics } from "@/services/analytics";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

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

const { getSelectedNodes, getSelectedAnnotations } = storeToRefs(useSelectionStore());
const nodeInteractionsStore = useNodeInteractionsStore();

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const CHIP_MAX_LENGTH = 24;
const truncate = (s: string) =>
  s.length > CHIP_MAX_LENGTH ? `${s.slice(0, CHIP_MAX_LENGTH)}…` : s;

const selectionChips = computed(() => {
  const nodeChips = getSelectedNodes.value.map((node) => ({
    key: `node-${node.id}`,
    label: truncate(nodeInteractionsStore.getNodeName(node.id)),
  }));
  const annotationChips = getSelectedAnnotations.value.map((ann) => ({
    key: `ann-${ann.id}`,
    label: truncate(stripHtml(ann.text.value)) || "Annotation",
  }));
  return [...nodeChips, ...annotationChips];
});

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

      <!-- Selection chips -->
      <div v-if="selectionChips.length" class="selection-chips">
        <Pill
          v-for="chip in selectionChips"
          :key="chip.key"
          color="gray"
          :title="chip.label"
        >{{ chip.label }}</Pill>
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

.selection-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 0;
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
