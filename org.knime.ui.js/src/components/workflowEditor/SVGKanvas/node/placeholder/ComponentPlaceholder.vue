<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { cloneDeep, isEqual } from "lodash-es";

import { ComponentPlaceholder } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { getToastPresets } from "@/toastPresets";

import ComponentPlaceholderState from "./ComponentPlaceholderState.vue";

type Props = {
  placeholder: ComponentPlaceholder;
};

const props = defineProps<Props>();

const { toastPresets } = getToastPresets();
const { selectSingleObject } = useSelectionStore();

let selectionStoreState = ref(null);

onMounted(() => {
  // @ts-expect-error cant be null
  selectionStoreState.value = cloneDeep(useSelectionStore().$state);
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

watch(placeholderState, () => {
  const didSelectionChange = !isEqual(
    useSelectionStore().$state,
    selectionStoreState.value,
  );

  if (!didSelectionChange && (isSuccess.value || isSuccessWithWarning.value)) {
    selectSingleObject({
      type: "node",
      id: props.placeholder.componentId ?? "",
    });
  }

  if (isSuccessWithWarning.value || isError.value) {
    const toastData = {
      message: props.placeholder.message,
      details: props.placeholder.details,
    };

    return isError.value
      ? toastPresets.workflow.componentLoadingFailed(toastData)
      : toastPresets.workflow.componentLoadedWithWarning(toastData);
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

<style scoped>
.progress {
  font-size: 10px;
  dominant-baseline: middle;
  text-anchor: middle;
  fill: var(--knime-masala);
  font-family: "Roboto Condensed", sans-serif;
  font-weight: normal;
  user-select: none;
}
</style>
