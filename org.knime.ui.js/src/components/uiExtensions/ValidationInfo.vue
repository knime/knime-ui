<script setup lang="ts">
import { computed } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";

import LoadingIndicator from "./LoadingIndicator.vue";
import ValidationInfoUnsupportedView from "./ValidationInfoUnsupportedView.vue";
import type { ValidationError } from "./common/types";
import { useCanNodeExecute } from "./useCanNodeExecute";

type Props = {
  selectedNode: KnimeNode | null;
  selectedPortIndex: number | null;
  validationError: ValidationError;
};

const props = defineProps<Props>();

const store = useStore();
const uiControls = computed(() => store.state.uiControls);

const isUnsupportedView = computed(
  () => props.validationError?.code === "UNSUPPORTED_PORT_VIEW",
);
const isNodeBusy = computed(() => props.validationError?.code === "NODE_BUSY");

const { canExecute } = useCanNodeExecute();

const openLegacyPortView = (executeNode: boolean) => {
  if (props.selectedNode && props.selectedPortIndex) {
    store.dispatch("workflow/openLegacyPortView", {
      nodeId: props.selectedNode.id,
      portIndex: props.selectedPortIndex,
      executeNode,
    });
  }
};
</script>

<template>
  <div class="info-wrapper">
    <ValidationInfoUnsupportedView
      v-if="isUnsupportedView"
      :selected-node="selectedNode"
      :selected-port-index="selectedPortIndex"
      :validation-error="validationError"
      :can-open-legacy-port-views="uiControls.canOpenLegacyPortViews"
      :can-execute="
        Boolean(selectedNode && canExecute(selectedNode, selectedPortIndex))
      "
      @open-legacy-port-view="openLegacyPortView"
    />

    <template v-else>
      <LoadingIndicator v-if="isNodeBusy" :message="validationError.message" />

      <span v-else>{{ validationError.message }}</span>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.info-wrapper {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
</style>
