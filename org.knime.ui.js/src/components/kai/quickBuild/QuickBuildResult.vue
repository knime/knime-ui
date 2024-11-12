<script setup lang="ts">
import KnimeIcon from "@knime/styles/img/KNIME_Triangle.svg";

type Props = {
  message: string;
  interactionId: string;
};

defineProps<Props>();
defineEmits(["close"]);
</script>

<template>
  <div class="quick-build-result">
    <div class="knime-icon">
      <KnimeIcon />
    </div>
    <div class="message">{{ message }}</div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-build-result {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-8);

  & .knime-icon {
    background-color: var(--knime-white);
    border-radius: 100%;
    height: 26px;
    width: 26px;
    display: flex;
    justify-content: center;
    align-items: center;

    &.user {
      left: auto;
      right: 0;
    }

    & svg {
      margin-top: -2px;

      @mixin svg-icon-size 16;
    }

    &.user svg.assistant {
      margin-top: -4px;
    }
  }

  & .message {
    height: 26px;
    line-height: 26px;
    background-color: var(--knime-white);
    color: var(--knime-masala);
    border-radius: 5px;
    padding: 0 var(--space-8);
    flex-grow: 1;
    font-size: 13px;
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
</style>
