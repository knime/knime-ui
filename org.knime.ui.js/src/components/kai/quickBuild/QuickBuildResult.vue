<script setup lang="ts">
import { ref } from "vue";

import { KaiMessage } from "@/api/gateway-api/generated-api";
import Message from "../chat/message/Message.vue";

type Props = {
  message: string;
  interactionId: string;
  summary?: string;
};

defineEmits(["close"]);

const props = defineProps<Props>();
const shouldShowExplanation = ref(false);

const showExplanation = () => {
  shouldShowExplanation.value = true;
};
</script>

<template>
  <div class="quick-build-result">
    <div class="summary-message">
      <Message
        :content="props.summary!"
        :role="KaiMessage.RoleEnum.Assistant"
        :always-show-feedback-controls="!shouldShowExplanation"
        :interaction-id="props.interactionId"
        :hide-footer="shouldShowExplanation"
      >
        <template #footer-append>
          <button
            v-if="!shouldShowExplanation"
            class="show-explanation-button"
            @click="showExplanation"
          >
            See full explanation
          </button>
        </template>
      </Message>
    </div>
    <div v-if="shouldShowExplanation" class="explanation-message">
      <Message
        :content="props.message"
        :role="KaiMessage.RoleEnum.Assistant"
        :always-show-feedback-controls="true"
        :interaction-id="props.interactionId"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-8);

  & .summary-message {
    display: flex;
    flex-direction: column;

    & .show-explanation-button {
      all: unset;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      padding-top: 10px;

      &:active,
      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
