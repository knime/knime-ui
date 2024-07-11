<script setup lang="ts">
import { Modal, OpenSourceCredits } from "@knime/components";

interface Props {
  active: boolean;
}

defineProps<Props>();

interface Emits {
  (e: "update:active", active: boolean): void;
}
defineEmits<Emits>();
</script>

<template>
  <div>
    <Modal
      :active="active"
      title="Open Source Credits"
      class="modal"
      style-type="info"
      @cancel="$emit('update:active', false)"
    >
      <template #notice>
        <OpenSourceCredits />
      </template>
    </Modal>
  </div>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 960px;

  & :deep(.inner) {
    top: 48%;
    height: 85%;
  }

  & :deep(.notice) {
    overflow: hidden auto;
    height: 100%;
  }
}
</style>
