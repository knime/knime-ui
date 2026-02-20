<script setup lang="ts">
import { computed } from "vue";

import CircleCheckIcon from "@knime/styles/img/icons/circle-check.svg";
import CircleCloseIcon from "@knime/styles/img/icons/circle-close.svg";

import type { InquiryTrace } from "@/store/ai/types";

type Props = {
  trace: InquiryTrace;
};

const props = defineProps<Props>();

const selectedOption = computed(() =>
  props.trace.inquiry.options.find(
    (opt) => opt.id === props.trace.selectedOptionId,
  ),
);

const isPrimary = computed(() => selectedOption.value?.style === "primary");

const optionLabel = computed(() => {
  const label = selectedOption.value?.label ?? props.trace.selectedOptionId;
  return props.trace.suffix ? `${label} (${props.trace.suffix})` : label;
});
</script>

<template>
  <div class="inquiry-response-trace">
    <CircleCheckIcon v-if="isPrimary" class="icon" />
    <CircleCloseIcon v-else class="icon" />
    <span class="title">{{ trace.inquiry.title }}</span>
    <span class="option-label">{{ optionLabel }}</span>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.inquiry-response-trace {
  display: grid;
  grid-template-columns: 16px 1fr minmax(0, 20%);
  align-items: center;
  gap: var(--kds-spacing-container-0-5x);
  color: var(--knime-dove-gray);
  font-size: 13px;

  & .icon {
    @mixin svg-icon-size 14;

    stroke: var(--knime-dove-gray);
  }

  & .title {
    font-size: 11px;
    min-width: 0;
  }

  & .option-label {
    font-size: 9px;
    text-align: right;
  }
}
</style>
