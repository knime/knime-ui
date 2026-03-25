<script setup lang="ts">
import { KaiMessage } from "@/api/gateway-api/generated-api";
import type { InquiryTrace, KaiUsageState } from "@/store/ai/types";
import ChatControls from "../chat/ChatControls.vue";
import Message from "../chat/message/Message.vue";

type Props = {
  message: string;
  interactionId: string;
  inquiryTraces?: InquiryTrace[];
  lastUserMessage?: string;
  usage: KaiUsageState;
  draftMessage?: string;
};

defineProps<Props>();
defineEmits<{
  close: [];
  sendMessage: [value: { message: string }];
  draftMessage: [value: string];
}>();
</script>

<template>
  <div class="quick-build-result">
    <Message
      class="message"
      :content="message"
      :role="KaiMessage.RoleEnum.Assistant"
      :interaction-id="interactionId"
      :inquiry-traces="inquiryTraces"
      kind="quick-build-explanation"
    />
    <ChatControls
      :last-user-message="lastUserMessage"
      :text="draftMessage"
      :usage="usage"
      placeholder="Send a follow-up..."
      @send-message="$emit('sendMessage', $event)"
      @draft-message="$emit('draftMessage', $event)"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  & .message {
    margin-top: 20px;
  }
}
</style>
