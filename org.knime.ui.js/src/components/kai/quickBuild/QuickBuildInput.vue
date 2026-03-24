<script setup lang="ts">
import ErrorIcon from "@knime/styles/img/icons/circle-close.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { KaiUsageState } from "@/store/ai/types";
import ChatControls from "../chat/ChatControls.vue";
import Message from "../chat/message/Message.vue";

type Props = {
  prompt?: string;
  interactionId?: string;
  lastUserMessage: string;
  errorMessage: string;
  usage: KaiUsageState;
  unsentMessage?: string;
};

defineProps<Props>();
defineEmits<{
  sendMessage: [value: { message: string }];
  unsentMessage: [value: string];
}>();
</script>

<template>
  <div class="quick-build-input">
    <Message
      v-if="prompt && interactionId"
      class="prompt"
      :role="KaiMessage.RoleEnum.Assistant"
      :interaction-id="interactionId"
      :content="prompt"
    />
    <ChatControls
      :last-user-message="lastUserMessage"
      :text="errorMessage ? lastUserMessage : unsentMessage ?? ''"
      :usage="usage"
      size="large"
      placeholder="What would you like to build?"
      @send-message="$emit('sendMessage', $event)"
      @unsent-message="$emit('unsentMessage', $event)"
    />
    <div v-if="errorMessage" class="error">
      <ErrorIcon class="error-icon" />
      <div>{{ errorMessage }}</div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-input {
  & .prompt {
    padding-bottom: var(--kds-spacing-container-0-25x);
    margin-top: 20px;
  }

  & .error {
    display: flex;
    margin-top: 10px;
    font-size: 12px;
    color: var(--knime-coral);

    & .error-icon {
      @mixin svg-icon-size 15;

      margin-top: -2px;
      margin-right: var(--kds-spacing-container-0-25x);
      fill: var(--knime-coral);
      stroke: var(--knime-white);
    }
  }
}
</style>
