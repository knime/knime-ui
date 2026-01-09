<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

type Props = {
  title: string;
  description: string;
  showAccentBar?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  checkboxLabel?: string | null;
  checkboxHelperText?: string | null;
  autoCancelAfter?: number | null;
};

const props = withDefaults(defineProps<Props>(), {
  showAccentBar: false,
  confirmLabel: "Allow",
  cancelLabel: "Skip",
  checkboxLabel: null,
  checkboxHelperText: null,
  autoCancelAfter: null,
});

type EmitPayload = { isCheckboxChecked: boolean };

const emit = defineEmits<{
  confirm: [payload: EmitPayload];
  cancel: [payload: EmitPayload];
}>();

const isCheckboxChecked = ref(false);
const isResolved = ref(false);

const remainingSeconds = ref(props.autoCancelAfter ?? 0);
let intervalId: ReturnType<typeof setInterval> | null = null;

const cancelLabelDisplay = computed(() => {
  if (props.autoCancelAfter !== null && remainingSeconds.value > 0) {
    return `${props.cancelLabel} (${remainingSeconds.value})`;
  }
  return props.cancelLabel;
});

const stopTimer = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

const handleConfirm = () => {
  if (isResolved.value) {
    return;
  }
  isResolved.value = true;
  stopTimer();
  emit("confirm", { isCheckboxChecked: isCheckboxChecked.value });
};

const handleCancel = () => {
  if (isResolved.value) {
    return;
  }
  isResolved.value = true;
  stopTimer();
  emit("cancel", { isCheckboxChecked: isCheckboxChecked.value });
};

const startTimer = () => {
  if (props.autoCancelAfter === null) {
    return;
  }

  intervalId = setInterval(() => {
    remainingSeconds.value -= 1;
    if (remainingSeconds.value <= 0) {
      handleCancel();
    }
  }, 1000);
};

onMounted(() => {
  startTimer();
});

onUnmounted(() => {
  handleCancel();
});
</script>

<template>
  <div
    class="card-container"
    :class="{ 'with-accent-bar': props.showAccentBar }"
  >
    <div class="header">{{ props.title }}</div>

    <div class="body">
      <div class="description">
        {{ props.description }}
      </div>
    </div>

    <div class="controls">
      <KdsCheckbox
        v-if="props.checkboxLabel"
        v-model="isCheckboxChecked"
        :label="props.checkboxLabel"
        :helper-text="props.checkboxHelperText"
      />

      <div class="action-buttons">
        <KdsButton
          variant="transparent"
          :label="cancelLabelDisplay"
          @click="handleCancel"
        />
        <KdsButton
          variant="filled"
          :label="props.confirmLabel"
          @click="handleConfirm"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.card-container {
  --permission-card-background-color: var(--knime-white);
  --permission-card-accent-color: var(--knime-wood-light);

  background-color: var(--permission-card-background-color);
  border-radius: 5px;
  padding: var(--space-12);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);

  &.with-accent-bar {
    border-left: 3px solid var(--permission-card-accent-color);
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
    flex-direction: row;
    gap: var(--kds-spacing-container-0-5x);
    justify-content: end;
    font-variant-numeric: tabular-nums;
  }
}
</style>
