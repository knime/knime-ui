<script setup lang="ts">
import { InlineMessage } from "@knime/components";

import { useAiProviderStore } from "@/store/ai/aiProvider";

const aiProviderStore = useAiProviderStore();
</script>

<template>
  <div class="panel-container unlicensed-panel">
    <InlineMessage
      class="info-message"
      variant="info"
      title="AI features unavailable"
    >
      {{ aiProviderStore.licensingStatus.unlicensedMessage }}
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
