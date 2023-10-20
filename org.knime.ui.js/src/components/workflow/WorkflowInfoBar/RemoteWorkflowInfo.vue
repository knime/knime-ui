<script setup lang="ts">
import { computed } from "vue";

import Button from "webapps-common/ui/components/Button.vue";
import { useStore } from "@/composables/useStore";
import { SpaceProviderNS } from "@/api/custom-types";
import * as $colors from "@/style/colors.mjs";

const store = useStore();
const isUnknownOrigin = computed(
  () => store.getters["application/activeProjectOrigin"] === null,
);
const activeProjectId = computed(() => store.state.application.activeProjectId);

const provider = computed<SpaceProviderNS.SpaceProvider | null>(() => {
  if (isUnknownOrigin.value) {
    return null;
  }

  return store.getters["spaces/getProviderInfo"](activeProjectId.value);
});

const isServerSpace = computed(
  () =>
    !isUnknownOrigin.value &&
    provider.value?.type === SpaceProviderNS.TypeEnum.SERVER,
);

const shouldShow = computed(() => {
  return (
    activeProjectId.value && (isUnknownOrigin.value || isServerSpace.value)
  );
});

const onSaveLocalCopy = () => {
  store.dispatch("workflow/saveWorkflowAs");
};
</script>

<template>
  <div
    v-if="shouldShow"
    :class="['banner', { blue: isServerSpace, yellow: isUnknownOrigin }]"
  >
    <span :class="{ 'flush-left': isUnknownOrigin }">
      <template v-if="isUnknownOrigin">
        You have opened a workflow that is not part of your spaces. Save as a
        local copy to keep your changes.
      </template>

      <template v-if="isServerSpace">
        You have opened a workflow from a KNIME Server. “Save” saves the
        workflow back on the KNIME Server
      </template>
    </span>

    <Button
      v-if="isUnknownOrigin"
      primary
      compact
      class="button"
      @click="onSaveLocalCopy"
    >
      Save local copy
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.banner {
  width: 100%;
  display: flex;
  padding: 5px 10px;
  justify-content: center;
  align-items: center;
  background: var(--bg-color);
  min-height: 40px;

  &.yellow {
    --bg-color: rgba(255 216 0 / 20%);
  }

  &.blue {
    --bg-color: v-bind("$colors.notificationBackground");
  }
}

.button {
  min-width: 120px;
  pointer-events: all;
  margin-left: auto;
}

.flush-left {
  margin-left: auto;
}
</style>
