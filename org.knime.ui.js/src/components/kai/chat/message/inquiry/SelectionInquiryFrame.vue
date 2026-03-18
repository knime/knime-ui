<script setup lang="ts">
import { KdsButton } from "@knime/kds-components";

import type { KaiInquiry } from "@/api/gateway-api/generated-api";

type Props = {
  inquiry: KaiInquiry;
  skipLabel: string;
  canConfirm: boolean;
};

defineProps<Props>();

defineEmits<{
  skip: [];
  confirm: [];
  keydown: [event: KeyboardEvent];
}>();
</script>

<template>
  <div class="card-container" @keydown="$emit('keydown', $event)">
    <div class="header">{{ inquiry.title }}</div>

    <div class="body">
      <div class="description">
        {{ inquiry.description }}
      </div>

      <slot />
    </div>

    <div class="controls">
      <div class="action-buttons">
        <KdsButton
          variant="transparent"
          :label="skipLabel"
          @click="$emit('skip')"
        />
        <KdsButton
          variant="filled"
          label="Confirm"
          :disabled="!canConfirm"
          @click="$emit('confirm')"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.card-container {
  --inquiry-card-background-color: var(--knime-white);

  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding-top: var(--space-6);
  padding-bottom: var(--space-6);
  background-color: var(--inquiry-card-background-color);
  border-radius: 5px;
}

.header {
  font: var(--kds-font-base-title-medium-strong);
  line-height: var(--kds-core-line-height-singleline);
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);

  & .action-buttons {
    display: flex;
    gap: var(--kds-spacing-container-0-5x);
    justify-content: end;
    font-variant-numeric: tabular-nums;
  }
}
</style>
