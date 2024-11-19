<script setup lang="ts">
import ErrorIcon from "@knime/styles/img/icons/circle-close.svg";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import ChatControls from "../chat/ChatControls.vue";
import Message from "../chat/message/Message.vue";

type Props = {
  prompt?: string;
  lastUserMessage: string;
  errorMessage: string;
};

defineProps<Props>();
defineEmits<{
  sendMessage: [value: { message: string }];
}>();
</script>

<template>
  <div class="quick-build-input">
    <Message
      v-if="prompt"
      class="prompt"
      :role="KaiMessage.RoleEnum.Assistant"
      :content="prompt"
    />
    <ChatControls
      class="chat-controls"
      :last-user-message="lastUserMessage"
      :text="errorMessage ? lastUserMessage : ''"
      @send-message="$emit('sendMessage', $event)"
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
  & .prompt {
    margin-bottom: -33px;
  }

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
      fill: var(--knime-coral);
    }
  }
}
</style>
