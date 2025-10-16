<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";

import QuickBuildInput from "@/components/kai/quickBuild/QuickBuildInput.vue";
import { useQuickBuild } from "@/components/kai/quickBuild/useQuickBuild";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";

const { usage } = storeToRefs(useAIAssistantStore());
const { errorMessage, result, sendMessage, lastUserMessage } = useQuickBuild({
  nodeId: ref(null),
  startPosition: ref({ x: 0, y: 0 }),
});
</script>

<template>
  <div class="kai-input-quick-action">
    <QuickBuildInput
      :prompt="result?.message"
      :interaction-id="result?.interactionId"
      :last-user-message="lastUserMessage"
      :error-message="errorMessage"
      :usage="usage"
      @send-message="sendMessage"
    />
  </div>
</template>

<style lang="postcss" scoped>
.kai-input-quick-action {
  width: 1000px;
}
</style>
