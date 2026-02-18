<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

import type { KaiInquiryOption } from "@/api/gateway-api/generated-api";

type Props = {
  title: string;
  description: string;
  options: KaiInquiryOption[];
  highlighted?: boolean;
  checkbox?: {
    label: string;
    subText?: string;
  };
  /**
   * Auto-select the default option after this many seconds.
   * The countdown is shown on the default option's button.
   */
  autoSelectAfter?: number;
  /**
   * The option ID to auto-select on timeout or unmount.
   * Falls back to the first secondary option, then the last option in the array.
   */
  defaultOptionId?: string;
};

const props = withDefaults(defineProps<Props>(), {
  highlighted: false,
  // eslint-disable-next-line no-undefined
  checkbox: undefined,
  // eslint-disable-next-line no-undefined
  autoSelectAfter: undefined,
  // eslint-disable-next-line no-undefined
  defaultOptionId: undefined,
});

const emit = defineEmits<{
  respond: [payload: { optionId: string; isCheckboxChecked: boolean }];
}>();

const isCheckboxChecked = ref(false);
const isResolved = ref(false);

const fallbackDefaultOption = computed(() => {
  return (
    props.options.find((opt) => opt.id === props.defaultOptionId) ??
    props.options.find((opt) => opt.style !== "primary") ??
    props.options.at(-1) ??
    null
  );
});

const remainingSeconds = ref(props.autoSelectAfter ?? 0);
let intervalId: number | null = null;

const stopTimer = () => {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
};

const respond = (optionId: string) => {
  if (isResolved.value) {
    return;
  }
  isResolved.value = true;
  stopTimer();
  emit("respond", { optionId, isCheckboxChecked: isCheckboxChecked.value });
};

const handleDefaultRespond = () => {
  if (fallbackDefaultOption.value) {
    respond(fallbackDefaultOption.value.id);
  }
};

const startTimer = () => {
  // eslint-disable-next-line no-undefined
  if (props.autoSelectAfter === undefined) {
    return;
  }

  intervalId = window.setInterval(() => {
    remainingSeconds.value -= 1;
    if (remainingSeconds.value <= 0) {
      handleDefaultRespond();
    }
  }, 1000);
};

const buttonLabel = (option: KaiInquiryOption) => {
  const isDefault = option.id === fallbackDefaultOption.value?.id;

  if (
    isDefault &&
    // eslint-disable-next-line no-undefined
    props.autoSelectAfter !== undefined &&
    remainingSeconds.value > 0
  ) {
    return `${option.label} (${remainingSeconds.value})`;
  }
  return option.label;
};

const buttonVariant = (option: KaiInquiryOption): "filled" | "transparent" => {
  return option.style === "primary" ? "filled" : "transparent";
};

onMounted(() => {
  startTimer();
});

onUnmounted(() => {
  handleDefaultRespond();
});
</script>

<template>
  <div class="card-container" :class="{ highlighted: props.highlighted }">
    <div class="header">{{ props.title }}</div>

    <div class="body">
      <div class="description">
        {{ props.description }}
      </div>
    </div>

    <div class="controls">
      <KdsCheckbox
        v-if="props.checkbox"
        v-model="isCheckboxChecked"
        :label="props.checkbox.label"
        :sub-text="props.checkbox.subText"
      />

      <div class="action-buttons">
        <KdsButton
          v-for="option in options"
          :key="option.id"
          :variant="buttonVariant(option)"
          :label="buttonLabel(option)"
          @click="respond(option.id)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.card-container {
  --inquiry-card-background-color: var(--knime-white);
  --inquiry-card-accent-color: var(--knime-wood-light);

  background-color: var(--inquiry-card-background-color);
  border-radius: 5px;
  padding-top: var(--space-6);
  padding-bottom: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  &.highlighted {
    border-left: 3px solid var(--inquiry-card-accent-color);
  }
}

.header {
  font: var(--kds-font-base-title-medium-strong);
  line-height: var(--kds-core-line-height-multiline-narrow);
}

.controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);

  & .action-buttons {
    display: flex;
    gap: var(--kds-spacing-container-0-5x);
    justify-content: end;
    font-variant-numeric: tabular-nums;
  }
}
</style>
