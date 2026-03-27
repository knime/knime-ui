<script setup lang="ts">
import { computed } from "vue";

import CircleCheckIcon from "@knime/styles/img/icons/circle-check.svg";
import CircleCloseIcon from "@knime/styles/img/icons/circle-close.svg";
import CircleInfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { KaiInquiry, KaiInquiryOption } from "@/api/gateway-api/generated-api";
import { FREEFORM_OPTION_ID } from "@/store/ai/constants";
import type { InquiryTrace } from "@/store/ai/types";

type Props = {
  trace: InquiryTrace;
};

const props = defineProps<Props>();

const isChoice = computed(
  () =>
    props.trace.inquiry.inquiryType ===
      KaiInquiry.InquiryTypeEnum.SingleChoice ||
    props.trace.inquiry.inquiryType ===
      KaiInquiry.InquiryTypeEnum.MultipleChoice,
);

const selectedOptions = computed(() =>
  props.trace.selectedOptionIds
    .filter((id) => id !== FREEFORM_OPTION_ID)
    .map(
      (id) =>
        props.trace.inquiry.options.find((opt) => opt.id === id) ?? {
          id,
          label: id,
          style: undefined,
        },
    ),
);

const isPrimary = computed(
  () =>
    selectedOptions.value.length === 1 &&
    selectedOptions.value[0].style === KaiInquiryOption.StyleEnum.Primary,
);

const isSkipped = computed(
  () =>
    props.trace.selectedOptionIds.length === 0 && !props.trace.freeformInput,
);

const withSuffix = (label: string) =>
  props.trace.suffix ? `${label} (${props.trace.suffix})` : label;

const optionLines = computed(() => {
  if (isSkipped.value) {
    return [withSuffix("Skipped")];
  }
  const optionLabels = selectedOptions.value.map((o) => o.label);
  if (props.trace.freeformInput) {
    if (optionLabels.length > 0) {
      return [...optionLabels, `+ ${props.trace.freeformInput}`];
    }
    return [props.trace.freeformInput];
  }
  if (optionLabels.length === 0) {
    return [];
  }
  const lastIndex = optionLabels.length - 1;
  return optionLabels.map((label, index) =>
    index === lastIndex ? withSuffix(label) : label,
  );
});
</script>

<template>
  <div class="inquiry-response-trace">
    <CircleInfoIcon v-if="isChoice" class="icon" />
    <CircleCheckIcon v-else-if="isPrimary" class="icon" />
    <CircleCloseIcon v-else class="icon" />
    <div class="text">
      <span class="title">{{ trace.inquiry.title }}</span>
      <span class="option-label">
        <span v-for="(line, index) in optionLines" :key="`${line}-${index}`">
          {{ line }}
        </span>
      </span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.inquiry-response-trace {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: var(--kds-spacing-container-0-5x);
  align-items: start;
  font-size: 13px;
  color: var(--knime-dove-gray);

  & .icon {
    @mixin svg-icon-size 14;

    stroke: var(--knime-dove-gray);
  }

  & .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  & .title {
    min-width: 0;
    font-size: 11px;
    line-height: 14px;
  }

  & .option-label {
    display: flex;
    flex-direction: column;
    font-size: 9px;
  }
}
</style>
