<script setup lang="ts">
import { computed } from "vue";
import { useTextareaAutosize } from "@vueuse/core";

import { FunctionButton } from "@knime/components";
import AbortIcon from "@knime/styles/img/icons/close.svg";
import SendIcon from "@knime/styles/img/icons/paper-flier.svg";

const emit = defineEmits(["sendMessage", "abort"]);

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false,
  },
  lastUserMessage: {
    type: String,
    default: "",
  },
});

const { textarea, input } = useTextareaAutosize();

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

const handleClick = () => {
  if (props.isProcessing) {
    emit("abort");
  } else {
    sendMessage();
  }
};

const isInputValid = computed(
  () => input.value && input.value.trim().length > 0,
);
const disabled = computed(() => !isInputValid.value && !props.isProcessing);
</script>

<template>
  <div class="chat-controls">
    <textarea
      ref="textarea"
      v-model="input"
      class="textarea"
      maxlength="300"
      @keydown="handleKeyDown"
    />
    <FunctionButton
      class="send-button"
      primary
      :disabled="disabled"
      @click="handleClick"
    >
      <AbortIcon v-if="isProcessing" class="abort-icon" />
      <SendIcon v-else class="send-icon" />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.chat-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-height: 120px;
  background-color: white;
  border: 1px solid var(--knime-stone-gray);
  overflow: hidden;

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
</style>
