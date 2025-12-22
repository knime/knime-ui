<script setup lang="ts">
import { ProgressBar } from "@knime/components";
import { KdsButton } from "@knime/kds-components";

type Props = {
  status: string | null;
};

defineProps<Props>();
defineEmits(["abort"]);
</script>

<template>
  <div class="quick-build-processing">
    <div class="progress-bar">
      <ProgressBar indeterminate compact />
    </div>
    <div class="main">
      <div class="status">
        {{ status }}
      </div>

      <KdsButton
        label="Cancel"
        leading-icon="x-close"
        variant="outlined"
        size="xsmall"
        @click="$emit('abort')"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-processing {
  & .progress-bar {
    margin-left: -8px;
    margin-right: -8px;
    margin-top: -8px;
  }

  & .main {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-top: 8px;

    & .status {
      flex: 1;
      font-size: 13px;
      line-height: 19.5px;
      color: var(--knime-dove-gray);
    }
  }
}
</style>
