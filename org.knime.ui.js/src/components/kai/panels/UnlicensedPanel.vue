<script setup lang="ts">
import { KdsInlineMessage } from "@knime/kds-components";

import { useAiProviderStore } from "@/store/ai/aiProvider";

const aiProviderStore = useAiProviderStore();
</script>

<template>
  <div class="panel-container unlicensed-panel">
    <KdsInlineMessage
      class="info-message"
      variant="info"
      headline="AI features unavailable"
      :description="aiProviderStore.licensingStatus.unlicensedMessage"
    />
  </div>
</template>

<style lang="postcss" scoped>
.panel-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.info-message {
  margin-top: auto;
}
</style>
