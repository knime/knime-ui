<script setup lang="ts">
import { Button } from "@knime/components";
import PlayIcon from "@knime/styles/img/icons/play.svg";

type Props = {
  canExecute: boolean;
  isExecuted: boolean;
};

defineProps<Props>();

const emit = defineEmits<{
  openLegacyPortView: [executeNode: boolean];
}>();
</script>

<template>
  <div data-test-id="execute-open-legacy-view-action">
    <Button
      v-if="!isExecuted"
      class="action-button action-execute"
      primary
      :disabled="!canExecute"
      compact
      @click="emit('openLegacyPortView', true)"
    >
      <PlayIcon />
      Execute and open legacy port view
    </Button>

    <Button
      :with-border="!isExecuted"
      :class="['action-button', { 'dim-border': !isExecuted }]"
      :primary="isExecuted"
      compact
      @click="emit('openLegacyPortView', false)"
    >
      Open legacy port view
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.action-button {
  margin-top: 20px;
}

.action-execute {
  margin-right: 5px;
}

.dim-border {
  --theme-button-small-border-color: var(--knime-silver-sand);
}
</style>
