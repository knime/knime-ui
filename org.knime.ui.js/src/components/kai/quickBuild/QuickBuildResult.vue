<script setup lang="ts">
import { KaiMessage } from "@/api/gateway-api/generated-api";
import Message from "../chat/message/Message.vue";

type Props = {
  message: string;
  interactionId: string;
};

defineProps<Props>();
defineEmits(["close"]);
</script>

<template>
  <div class="quick-build-result">
    <Message
      class="message"
      :content="message"
      :role="KaiMessage.RoleEnum.Assistant"
      :interaction-id="interactionId"
      kind="quick-build-explanation"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-8);

  & .message {
    margin-top: 20px;
  }
}
</style>
