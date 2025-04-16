<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { isEqual } from "lodash-es";

import { ComponentPlaceholder } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { getToastPresets } from "@/toastPresets";

import ComponentPlaceholderState from "./ComponentPlaceholderState.vue";

type Props = {
  placeholder: ComponentPlaceholder;
};

const props = defineProps<Props>();

const { toastPresets } = getToastPresets();
const { deselectAllObjects } = useSelectionStore();

let selectionStoreState = ref<null | string[]>(null);

onMounted(() => {
  selectionStoreState.value = useSelectionStore().selectedNodeIds;
});

const placeholderState = computed(() => props.placeholder.state);
const isError = computed(
  () => placeholderState.value === ComponentPlaceholder.StateEnum.ERROR,
);
const isSuccessWithWarning = computed(
  () =>
    placeholderState.value ===
    ComponentPlaceholder.StateEnum.SUCCESSWITHWARNING,
);
const isSuccess = computed(
  () => placeholderState.value === ComponentPlaceholder.StateEnum.SUCCESS,
);

watch(placeholderState, async () => {
  const didSelectionChange = !isEqual(
    selectionStoreState.value,
    useSelectionStore().selectedNodeIds,
  );

  if (!didSelectionChange && (isSuccess.value || isSuccessWithWarning.value)) {
    if (props.placeholder.componentId) {
      await deselectAllObjects([props.placeholder.componentId]);
    }
  }

  if (isSuccessWithWarning.value || isError.value) {
    const toastData = {
      message: props.placeholder.message,
      details: props.placeholder.details,
    };

    if (isError.value) {
      toastPresets.workflow.componentLoadingFailed(toastData);
    } else {
      toastPresets.workflow.componentLoadedWithWarning(toastData);
    }
  }
});

// Adjust so there is no jumping when component is loaded
const adjustedPosition = computed(() => {
  return {
    x: props.placeholder.position.x + 1,
    // eslint-disable-next-line no-magic-numbers
    y: props.placeholder.position.y + 6,
  };
});
</script>

<template>
  <ComponentPlaceholderState
    v-if="
      placeholder.state === ComponentPlaceholder.StateEnum.LOADING ||
      placeholder.state === ComponentPlaceholder.StateEnum.ERROR
    "
    :id="placeholder.id"
    :progress="placeholder.progress"
    :position="adjustedPosition"
    :state="placeholder.state"
    :name="placeholder.name"
  />
</template>
