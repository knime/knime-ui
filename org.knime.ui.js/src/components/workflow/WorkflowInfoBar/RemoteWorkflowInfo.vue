<script setup lang="ts">
import { computed } from "vue";

import { useStore } from "@/composables/useStore";
import { SpaceProviderNS } from "@/api/custom-types";
import * as $colors from "@/style/colors.mjs";

const store = useStore();
const isUnknownProject = computed(
  () => store.getters["application/isUnknownProject"],
);
const activeProjectId = computed(() => store.state.application.activeProjectId);

const provider = computed<SpaceProviderNS.SpaceProvider | null>(() => {
  if (isUnknownProject.value) {
    return null;
  }

  return store.getters["spaces/getProviderInfo"](activeProjectId.value);
});

const isServerSpace = computed(
  () =>
    !isUnknownProject.value &&
    provider.value?.type === SpaceProviderNS.TypeEnum.SERVER,
);

const shouldShow = computed(() => {
  return (
    activeProjectId.value && (isUnknownProject.value || isServerSpace.value)
  );
});
</script>

<template>
  <div
    v-if="shouldShow"
    :class="['banner', { blue: isServerSpace, yellow: isUnknownProject }]"
  >
    <span>
      <template v-if="isUnknownProject">
        You have opened a workflow that is not part of your spaces. “Save” a
        local copy to keep your changes.
      </template>

      <template v-if="isServerSpace">
        You have opened a workflow from a KNIME Server. “Save” the workflow back
        to KNIME Server to keep your changes.
      </template>
    </span>
  </div>
</template>

<style lang="postcss" scoped>
.banner {
  width: 100%;
  display: flex;
  padding: 5px 10px;
  justify-content: center;
  align-items: center;
  min-height: 40px;

  &.yellow {
    background: v-bind("$colors.notifications.warning");
  }

  &.blue {
    background: v-bind("$colors.notifications.info");
  }
}
</style>
