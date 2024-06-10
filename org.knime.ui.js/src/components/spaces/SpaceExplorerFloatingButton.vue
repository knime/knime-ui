<script setup lang="ts">
import PlusButton from "webapps-common/ui/components/PlusButton.vue";

type Props = {
  title: string;
  disabled?: boolean;
};

withDefaults(defineProps<Props>(), {
  title: null,
  disabled: false,
});
</script>

<template>
  <div class="floating-btn">
    <PlusButton :title="title" primary :disabled="disabled" />
  </div>
</template>

<style lang="postcss" scoped>
.floating-btn {
  position: fixed;
  top: 265px;
  right: 32px;
}
</style>
