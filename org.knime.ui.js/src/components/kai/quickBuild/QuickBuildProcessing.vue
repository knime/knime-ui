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

    & :deep(progress) {
      --progress-bar-radius: 0;
    }
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
      width: 30px;
      height: 30px;
      border-color: var(--knime-silver-sand);

      &:hover {
        background-color: var(--knime-silver-sand);
      }

      & svg {
        @mixin svg-icon-size 18;

        margin-left: 5px;
      }
    }
  }
}
</style>
