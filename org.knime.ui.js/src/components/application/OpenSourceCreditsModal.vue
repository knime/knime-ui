<script setup lang="ts">
import { ref, watch } from "vue";

import { OpenSourceCredits } from "@knime/components";
import { KdsButton, KdsModal } from "@knime/kds-components";

const usedPackages = ref<any[]>([]);

const props = defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  "update:active": [active: boolean];
}>();

// only load the credits if we open the dialog at least once
const stopWatchForActive = watch(
  () => props.active,
  (active) => {
    if (active && usedPackages.value.length === 0) {
      import("../../../licenses/used-packages.json")
        .then((module) => {
          usedPackages.value = module.default;
          stopWatchForActive();
        })
        .catch((err) => consola.warn(err.message));
    }
  },
  { immediate: true },
);

const closeModal = () => emit("update:active", false);
</script>

<template>
  <div>
    <KdsModal
      :active="active"
      title="Open Source Credits"
      width="xlarge"
      closedby="any"
      @close="closeModal"
    >
      <template #body>
        <OpenSourceCredits
          v-if="usedPackages.length > 0"
          class="credits"
          :packages="usedPackages"
        />
      </template>
      <template #footer><KdsButton label="Ok" @click="closeModal" /></template>
    </KdsModal>
  </div>
</template>

<style lang="postcss" scoped>
.credits {
  font: var(--kds-font-base-body-large);
}
</style>
