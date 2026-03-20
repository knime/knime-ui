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
  size?: "medium" | "large";
};

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  lastUserMessage: "",
  usage: null,
  text: "",
  placeholder: "",
  size: "medium",
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
    <!-- Input field if user is within AI usage limits -->
    <div
      v-if="isWithinLimit"
      class="textarea-wrapper"
      :class="props.size"
      @click="handleClick"
    >
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
    <!-- or paywall if limits reached -->
    <InlineMessage
      v-if="!isWithinLimit"
      variant="info"
      title="All free monthly AI interactions used"
    >
      <a :href="`${PRICING_URL}&alt=kaiChat`">Upgrade</a> to continue building
      with AI or wait {{ getDaysLeftInMonth() }} days to use it again.
    </InlineMessage>

    <!-- Current usage -->
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
  overflow: hidden;
  cursor: text;
  background-color: var(--knime-white);
  border: 1px solid var(--knime-stone-gray);
  border-radius: 3px;

  &.medium {
    min-height: 50px;
    max-height: 200px;
  }

  &.large {
    min-height: 120px;
  }

  & .textarea {
    flex-grow: 1;
    width: 100%;
    padding: 10px 8px 0;
    font-size: 13px;
    font-weight: 300;
    line-height: 150%;
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
  line-height: 1.95;
}

.kai-notice {
  margin-left: auto;
}
</style>
