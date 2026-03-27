<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";

import { KdsCheckboxGroup, KdsTextInput } from "@knime/kds-components";

import type { KaiInquiry } from "@/api/gateway-api/generated-api";
import { FREEFORM_OPTION_ID } from "@/store/ai/constants";
import type { ChainType } from "@/store/ai/types";

import SelectionInquiryFrame from "./SelectionInquiryFrame.vue";
import { useSelectionInquiry } from "./useSelectionInquiry";

type Props = {
  inquiry: KaiInquiry;
  chainType: ChainType;
};

const props = defineProps<Props>();

const checkedIds = ref<string[]>([]);

const { optionValues, freeformText, skip, skipLabel, submitSelection } =
  useSelectionInquiry({
    inquiry: props.inquiry,
    chainType: props.chainType,
  });

const isFreeformSelected = computed(() =>
  checkedIds.value.includes(FREEFORM_OPTION_ID),
);

const canConfirm = computed(
  () =>
    checkedIds.value.length > 0 &&
    (!isFreeformSelected.value || freeformText.value.trim().length > 0),
);

const handleConfirm = () => {
  if (!canConfirm.value) {
    return;
  }

  submitSelection({
    selectedOptionIds: [...checkedIds.value],
    includeFreeformInput: isFreeformSelected.value,
  });
};

const checkboxGroupRef =
  useTemplateRef<InstanceType<typeof KdsCheckboxGroup>>("checkboxGroup");

onMounted(() => {
  nextTick(() => {
    const container = checkboxGroupRef.value?.$el as HTMLElement | undefined;
    container?.querySelector<HTMLElement>("button")?.focus();
  });
});

const handleCardKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !isFreeformSelected.value) {
    event.preventDefault();
    handleConfirm();
  } else if (event.key === "Escape") {
    event.preventDefault();
    skip();
  }
};
</script>

<template>
  <SelectionInquiryFrame
    :inquiry="inquiry"
    :skip-label="skipLabel"
    :can-confirm="canConfirm"
    @confirm="handleConfirm"
    @skip="skip"
    @keydown="handleCardKeydown"
  >
    <KdsCheckboxGroup
      ref="checkboxGroup"
      v-model="checkedIds"
      :possible-values="optionValues"
      alignment="vertical"
    />

    <div v-if="isFreeformSelected" @keydown.enter="handleConfirm">
      <KdsTextInput
        v-model="freeformText"
        aria-label="Freeform response"
        placeholder="Type your answer..."
      />
    </div>
  </SelectionInquiryFrame>
</template>
