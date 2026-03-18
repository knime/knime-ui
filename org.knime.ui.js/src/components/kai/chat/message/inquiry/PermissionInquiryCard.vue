<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";

import { KdsButton, KdsCheckbox } from "@knime/kds-components";

import { KaiInquiry, KaiInquiryOption } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import {
  type ActionPermission,
  useAISettingsStore,
} from "@/store/ai/aiSettings";
import type { ChainType } from "@/store/ai/types";

import { useInquiryLifecycle } from "./useInquiryLifecycle";

type Props = {
  inquiry: KaiInquiry;
  chainType: ChainType;
};

const props = defineProps<Props>();

const aiAssistantStore = useAIAssistantStore();
const aiSettingsStore = useAISettingsStore();

const actionId = computed(() => {
  const value = props.inquiry.metadata?.actionId;
  return typeof value === "string" ? value : null;
});

const isActionPermission = (value: string): value is ActionPermission =>
  value === "allow" || value === "deny";

// Ensure primary button is rendered last (rightmost per design conventions).
const sortedOptions = computed(() =>
  [...props.inquiry.options].sort((a, b) => {
    const aIsPrimary = a.style === KaiInquiryOption.StyleEnum.Primary ? 1 : 0;
    const bIsPrimary = b.style === KaiInquiryOption.StyleEnum.Primary ? 1 : 0;
    return aIsPrimary - bIsPrimary;
  }),
);

const isCheckboxChecked = ref(false);

const timeoutOption = computed(() => {
  return (
    props.inquiry.options.find(
      (opt) => opt.id === props.inquiry.defaultOptionId,
    ) ??
    props.inquiry.options.find(
      (opt) => opt.style !== KaiInquiryOption.StyleEnum.Primary,
    ) ??
    props.inquiry.options.at(-1) ??
    null
  );
});

const respondWithTimeoutOption = () => {
  if (timeoutOption.value) {
    aiAssistantStore.respondToInquiry({
      chainType: props.chainType,
      selectedOptionIds: [timeoutOption.value.id],
    });
  }
};

const { remainingSeconds, isCountdownVisible, resolveOnce } =
  useInquiryLifecycle({
    timeoutSeconds: props.inquiry.timeoutSeconds,
    onTimeout: respondWithTimeoutOption,
    onUnmountUnresolved: respondWithTimeoutOption,
  });

const handlePermissionDecision = (optionId: string) => {
  resolveOnce(async () => {
    const shouldPersistDecision =
      isCheckboxChecked.value &&
      Boolean(actionId.value) &&
      isActionPermission(optionId);

    if (shouldPersistDecision) {
      await aiSettingsStore.setPermissionForActionForActiveProject(
        actionId.value!,
        optionId,
      );
    }

    aiAssistantStore.respondToInquiry({
      chainType: props.chainType,
      selectedOptionIds: [optionId],
      suffix: shouldPersistDecision ? "Saved" : undefined,
    });
  });
};

const buttonLabel = (option: KaiInquiryOption) => {
  const isDefault = option.id === timeoutOption.value?.id;

  if (isDefault && isCountdownVisible.value) {
    return `${option.label} (${remainingSeconds.value})`;
  }
  return option.label;
};

const buttonVariant = (option: KaiInquiryOption): "filled" | "transparent" => {
  return option.style === KaiInquiryOption.StyleEnum.Primary
    ? "filled"
    : "transparent";
};

const primaryOption = computed(() =>
  props.inquiry.options.find(
    (opt) => opt.style === KaiInquiryOption.StyleEnum.Primary,
  ),
);

const secondaryOption = computed(() =>
  props.inquiry.options.find(
    (opt) => opt.style !== KaiInquiryOption.StyleEnum.Primary,
  ),
);

// --- Focus & keyboard ---

const cardRef = useTemplateRef<HTMLElement>("card");

onMounted(() => {
  nextTick(() => {
    const primaryButton =
      cardRef.value?.querySelector<HTMLElement>("button.filled");
    primaryButton?.focus();
  });
});

const handleCardKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (primaryOption.value) {
      handlePermissionDecision(primaryOption.value.id);
    }
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (secondaryOption.value) {
      handlePermissionDecision(secondaryOption.value.id);
    }
  }
};
</script>

<template>
  <div ref="card" class="card-container" @keydown="handleCardKeydown">
    <div class="header">{{ inquiry.title }}</div>

    <div class="body">
      <div class="description">
        {{ inquiry.description }}
      </div>
    </div>

    <div class="controls">
      <KdsCheckbox
        v-model="isCheckboxChecked"
        label="Remember choice"
        sub-text="This will be saved for current workflow"
      />

      <div class="action-buttons">
        <KdsButton
          v-for="option in sortedOptions"
          :key="option.id"
          :variant="buttonVariant(option)"
          :label="buttonLabel(option)"
          @click="handlePermissionDecision(option.id)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.card-container {
  --inquiry-card-background-color: var(--knime-white);

  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding-top: var(--space-6);
  padding-bottom: var(--space-6);
  background-color: var(--inquiry-card-background-color);
  border-radius: 5px;
}

.header {
  font: var(--kds-font-base-title-medium-strong);
  line-height: var(--kds-core-line-height-singleline);
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
