<script setup lang="ts">
import { PlusButton } from "@knime/components";

type Props = {
  title: string | null;
  disabled?: boolean;
};

withDefaults(defineProps<Props>(), {
  title: null,
  disabled: false,
});
</script>

<template>
  <div class="floating-btn">
    <PlusButton :title="title ?? undefined" primary :disabled="disabled" />
  </div>
</template>

<style lang="postcss" scoped>
.floating-btn {
  position: fixed;
  top: 265px;
  right: 32px;
  z-index: v-bind("$zIndices.layerMinorElevation");
}
</style>
