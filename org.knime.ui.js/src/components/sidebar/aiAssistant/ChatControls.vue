<script setup lang="ts">
import { computed } from "vue";
import { useTextareaAutosize } from "@vueuse/core";

import Button from "webapps-common/ui/components/Button.vue";
import SendIcon from "webapps-common/ui/assets/img/icons/paper-flier.svg";
import AbortIcon from "webapps-common/ui/assets/img/icons/circle-close.svg";

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
  emit("sendMessage", input.value);
  input.value = "";
};

const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!props.isProcessing) {
      sendMessage();
    }
  }
  if (e.key === "ArrowUp" && input.value === "") {
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

const disabled = computed(() => !input.value && !props.isProcessing);
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
    <Button class="send-button" :disabled="disabled" @click="handleClick">
      <AbortIcon v-if="props.isProcessing" class="abort-icon" />
      <SendIcon v-else />
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.chat-controls {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  position: relative;
  background-color: white;
  border: 1px solid var(--knime-stone-gray);
  overflow: hidden;
  border-radius: 3px;

  & .textarea {
    font-size: 13px;
    font-weight: 300;
    line-height: 18px;
    padding: 10px;
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
    padding: 0;
    padding-top: 10px;

    & svg {
      @mixin svg-icon-size 23;
    }

    & svg.abort-icon {
      stroke: var(--knime-coral-dark);
    }
  }
}
</style>
