<script setup lang="ts">
import ChatControls from "../chat/ChatControls.vue";

type Props = {
  isProcessing: boolean;
  lastUserMessage: string;
  error: string;
};

defineProps<Props>();
defineEmits(["send-message", "abort"]);
</script>

<template>
  <div class="quick-build-input">
    <ChatControls
      class="chat-controls"
      :is-processing="isProcessing"
      :last-user-message="lastUserMessage"
      @send-message="$emit('send-message', $event)"
      @abort="$emit('abort')"
    />
    <div v-if="error">
      {{ error }}
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-input {
}
</style>
