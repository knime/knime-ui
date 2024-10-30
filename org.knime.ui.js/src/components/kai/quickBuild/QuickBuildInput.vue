<script setup lang="ts">
import ChatControls from "../chat/ChatControls.vue";
import ErrorIcon from "@knime/styles/img/icons/circle-close.svg";
import { KaiMessage } from "@/api/gateway-api/generated-api";

type Props = {
  prompt?: string;
  lastUserMessage: string;
  errorMessage: string;
};

defineProps<Props>();
defineEmits(["send-message", "abort"]);
</script>

<template>
  <div class="quick-build-input">
    <Message v-if="prompt" :role="KaiMessage.RoleEnum.Assistant" :content="prompt" />
    <ChatControls
      class="chat-controls"
      :last-user-message="lastUserMessage"
      @send-message="$emit('send-message', $event)"
      @abort="$emit('abort')"
    />
    <div v-if="errorMessage" class="error">
      <ErrorIcon />
      <div>{{ errorMessage }}</div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-input {
 & .error {
  margin-top: 10px;
  color: var(--knime-coral);
  font-size: 12px;
  display: flex;

  & svg {
    @mixin svg-icon-size 15;

    margin-top: -2px;
    margin-right: 4px;
    stroke: var(--knime-white);
    fill:  var(--knime-coral);
  }
 }
}
</style>
