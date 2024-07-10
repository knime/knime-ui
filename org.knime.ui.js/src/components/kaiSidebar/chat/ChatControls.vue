<script setup lang="ts">
import { computed } from "vue";
import { useTextareaAutosize } from "@vueuse/core";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import SendIcon from "@knime/styles/img/icons/paper-flier.svg";
import AbortIcon from "@knime/styles/img/icons/close.svg";

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
    emit("sendMessage", input.value);
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
      :disabled="disabled"
      @click="handleClick"
    >
      <AbortIcon v-if="isProcessing" class="abort-icon" />
      <SendIcon v-else />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.chat-controls {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  position: relative;
  background-color: white;
  border: 1px solid var(--knime-stone-gray);
  overflow: hidden;

  & .textarea {
    color: 1px solid var(--knime-stone-gray);
    font-size: 13px;
    font-weight: 300;
    line-height: 150%;
    padding: 13px 10px;
    max-height: 120px;
    min-height: 50px;
    width: 100%;
    resize: none;
    border: none;

    &:focus {
      outline: none;
    }
  }

  & .send-button {
    margin: 0 8px 11px 0;

    & svg {
      @mixin svg-icon-size 18;

      stroke: var(--knime-dove-gray);
      margin-left: -2px;
    }

    & svg.abort-icon {
      stroke: var(--knime-dove-gray);
      margin-left: 0;
    }
  }
}
</style>
