<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useSpeechRecognition, useTextareaAutosize } from "@vueuse/core";

import { FunctionButton, SkeletonItem } from "@knime/components";
import AbortIcon from "@knime/styles/img/icons/close.svg";
import MicrophoneIcon from "@knime/styles/img/icons/microphone.svg";
import SendIcon from "@knime/styles/img/icons/paper-flier.svg";

import { useAudioRecorder } from "@/components/kai/chat/useAudioRecord.ts";

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
  text: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
});

const { textarea, input } = useTextareaAutosize();

const { startRecording, stopRecording, isRecording, busy } =
  useAudioRecorder(input);

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
  <div
    class="chat-controls"
    :class="{
      busy,
    }"
    @click="handleClick"
  >

    <div class="input-container">
      <textarea
        ref="textarea"
        v-model="input"
        class="textarea"
        aria-label="Type your message"
        :maxlength="$characterLimits.kai"
        :placeholder="placeholder"
        :disabled="busy"
        style="position: relative;"
        @keydown="handleKeyDown"
      />
    </div>


    <div class="button-group">
      <FunctionButton
        class="microphone-button"
        :class="{ recording: isRecording, processing: isProcessing }"
        @click="isRecording === true ? stopRecording() : startRecording()"
      >
        <MicrophoneIcon
          class="send-icon"
          aria-hidden="true"
          focusable="false"
        />
      </FunctionButton>
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
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.input-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.chat-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-height: 120px;
  background-color: white;
  border: 1px solid var(--knime-stone-gray);
  overflow: hidden;
  cursor: text;

  &.busy {

      background-color: var(--knime-gray-ultra-light);

  }

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

  .button-group {
    display: flex;
    gap: 8px;
    width: 100%;
    padding: 0 8px 8px;
    justify-content: end;
  }

  & .send-button,
  & .microphone-button {
    margin: 0;

    & svg {
      stroke: var(--knime-dove-gray);
    }
  }

  .recording {
    background-color: #ff4444;

    & svg {
      stroke: white;
    }
  }

  .processing {
    display: none;
  }
}
</style>
