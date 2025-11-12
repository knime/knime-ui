<script setup lang="ts">
import { InlineMessage } from "@knime/components";

import { useAIAssistantStore } from "@/store/ai/aiAssistant";
</script>

<template>
  <div class="panel-container unlicensed-panel">
    <InlineMessage
      class="info-message"
      variant="info"
      title="AI features unavailable"
    >
      {{ useAIAssistantStore().unlicensedUserMessage }}
    </InlineMessage>
  </div>
</template>

<style lang="postcss" scoped>
.panel-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.info-message {
  margin-top: auto;
}
</style>
