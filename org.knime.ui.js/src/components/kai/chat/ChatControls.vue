<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useTextareaAutosize } from "@vueuse/core";

import { FunctionButton, InlineMessage } from "@knime/components";
import AbortIcon from "@knime/styles/img/icons/close.svg";
import SendIcon from "@knime/styles/img/icons/paper-flier.svg";

import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import type { KaiUsageState } from "@/store/ai/types";

import { getDaysLeftInMonth } from "./utils";

const emit = defineEmits(["sendMessage", "abort"]);

type Props = {
  isProcessing?: boolean;
  lastUserMessage?: string;
  usage?: KaiUsageState;
  text?: string;
  placeholder?: string;
};

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  lastUserMessage: "",
  usage: null,
  text: "",
  placeholder: "",
});

const { PRICING_URL } = knimeExternalUrls;

const isWithinLimit = computed(() => {
  if (props.usage === null || props.usage.limit === null) {
    return true;
  }
  return props.usage.used < props.usage.limit;
});

const { textarea, input } = useTextareaAutosize();

watch(
  () => props.text,
  () => {
    input.value = props.text;
  },
  { immediate: true },
);

onMounted(() => {
  textarea.value?.focus();
});

const sendMessage = () => {
  if (input.value) {
    emit("sendMessage", { message: input.value });
    input.value = "";
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!props.isProcessing) {
      sendMessage();
    }
  }
  if (event.key === "ArrowUp" && input.value === "") {
    input.value = props.lastUserMessage;
  }
};

const handleSendButtonClick = () => {
  if (props.isProcessing) {
    emit("abort");
  } else {
    sendMessage();
  }
};

const handleClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    textarea.value?.focus();
  }
};

const isInputValid = computed(
  () => input.value && input.value.trim().length > 0,
);
const disabled = computed(() => !isInputValid.value && !props.isProcessing);
</script>

<template>
  <div>
    <div v-if="isWithinLimit" class="textarea-wrapper" @click="handleClick">
      <textarea
        ref="textarea"
        v-model="input"
        class="textarea"
        aria-label="Type your message"
        :maxlength="$characterLimits.kai"
        :placeholder="placeholder"
        @keydown="handleKeyDown"
      />
      <FunctionButton
        class="send-button"
        primary
        :disabled="disabled"
        @click="handleSendButtonClick"
      >
        <AbortIcon
          v-if="isProcessing"
          class="abort-icon"
          aria-hidden="true"
          focusable="false"
        />
        <SendIcon
          v-else
          class="send-icon"
          aria-hidden="true"
          focusable="false"
        />
      </FunctionButton>
    </div>
    <InlineMessage
      v-if="!isWithinLimit"
      variant="info"
      title="All free monthly AI interactions used"
    >
      <a :href="PRICING_URL">Upgrade</a> to continue building with AI or wait
      {{ getDaysLeftInMonth() }} days to use it again.
    </InlineMessage>
    <div class="chat-usage">
      <div
        v-if="usage !== null && usage.limit !== null && isWithinLimit"
        class="kai-usage"
      >
        {{ usage.used }}/{{ usage.limit }} monthly interactions
      </div>
      <div class="kai-notice">K-AI can make mistakes.</div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.textarea-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-height: 120px;
  background-color: white;
  border: 1px solid var(--knime-stone-gray);
  overflow: hidden;
  cursor: text;

  & .textarea {
    font-size: 13px;
    font-weight: 300;
    line-height: 150%;
    padding: 10px 8px 0;
    flex-grow: 1;
    width: 100%;
    resize: none;
    border: none;

    &:focus {
      outline: none;
    }
  }

  & .send-button {
    align-self: flex-end;
    margin-right: 8px;
    margin-bottom: 8px;

    & svg {
      stroke: var(--knime-dove-gray);

      &.send-icon {
        margin-left: -1px;
      }
    }
  }
}

.chat-usage {
  display: flex;
  font-size: 10px;
  font-weight: 500;
}

.kai-notice {
  margin-left: auto;
}
</style>
