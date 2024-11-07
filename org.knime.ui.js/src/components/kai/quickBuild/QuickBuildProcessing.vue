<script setup lang="ts">
import { Button, ProgressBar } from "@knime/components";
import CancelIcon from "@knime/styles/img/icons/cancel-execution.svg";

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
      <Button class="cancel-button" with-border @click="$emit('abort')"
        ><CancelIcon
      /></Button>
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

    & .cancel-button {
      padding: 0;
      width: 26px;
      height: 26px;
      border-color: var(--knime-silver-sand);

      &:hover {
        background-color: var(--knime-silver-sand);
      }

      & svg {
        @mixin svg-icon-size 16;

        margin-left: 4px;
        margin-top: 1px;
      }
    }
  }
}
</style>
