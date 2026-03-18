<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";

import { KdsRadioButtonGroup, KdsTextInput } from "@knime/kds-components";

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

const defaultSelectedId =
  props.inquiry.options.find(
    (option) => option.id === props.inquiry.defaultOptionId,
  )?.id ?? props.inquiry.options[0]?.id;

const selectedId = ref<string | undefined>(defaultSelectedId);

const {
  optionValues,
  freeformText,
  skip,
  skipLabel,
  submitSelection,
  resolveOnce,
} = useSelectionInquiry({
  inquiry: props.inquiry,
  chainType: props.chainType,
});

const isFreeformSelected = computed(
  () => selectedId.value === FREEFORM_OPTION_ID,
);

const canConfirm = computed(
  () =>
    Boolean(selectedId.value) &&
    (!isFreeformSelected.value || freeformText.value.trim().length > 0),
);

const handleConfirm = () => {
  if (!canConfirm.value || !selectedId.value) {
    return;
  }

  submitSelection({
    selectedOptionIds: [selectedId.value],
    includeFreeformInput: isFreeformSelected.value,
  });
};

const handleSkip = () => {
  resolveOnce(() => skip());
};

const radioGroupRef =
  useTemplateRef<InstanceType<typeof KdsRadioButtonGroup>>("radioGroup");

onMounted(() => {
  nextTick(() => {
    const container = radioGroupRef.value?.$el as HTMLElement | undefined;
    container?.querySelector<HTMLElement>("[tabindex='0']")?.focus();
  });
});

const handleCardKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !isFreeformSelected.value) {
    event.preventDefault();
    handleConfirm();
  } else if (event.key === "Escape") {
    event.preventDefault();
    handleSkip();
  }
};
</script>

<template>
  <SelectionInquiryFrame
    :inquiry="inquiry"
    :skip-label="skipLabel"
    :can-confirm="canConfirm"
    @confirm="handleConfirm"
    @skip="handleSkip"
    @keydown="handleCardKeydown"
  >
    <KdsRadioButtonGroup
      ref="radioGroup"
      v-model="selectedId"
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
