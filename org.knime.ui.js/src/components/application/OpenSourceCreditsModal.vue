<script setup lang="ts">
import { ref } from "vue";

import { Modal, OpenSourceCredits } from "@knime/components";

const usedPackages = ref<any[]>([]);

import("../../../licenses/used-packages.json")
  .then((module) => {
    usedPackages.value = module.default;
  })
  .catch((err) => consola.warn(err.message));

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
        <OpenSourceCredits :packages="usedPackages" />
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
