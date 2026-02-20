<script setup lang="ts">
import {
  KaiInquiry,
  type KaiInquiry as KaiInquiryType,
} from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import {
  type ActionPermission,
  useAISettingsStore,
} from "@/store/ai/aiSettings";
import type { ChainType } from "@/store/ai/types";

import InquiryCard from "./InquiryCard.vue";

type Props = {
  inquiry: KaiInquiryType;
  chainType: ChainType;
};

const props = defineProps<Props>();

const aiAssistantStore = useAIAssistantStore();
const aiSettingsStore = useAISettingsStore();

const isPermission =
  props.inquiry.inquiryType === KaiInquiry.InquiryTypeEnum.Permission;
const actionId = props.inquiry.metadata?.actionId as string | undefined;

const handleRespond = ({
  optionId,
  isCheckboxChecked,
}: {
  optionId: string;
  isCheckboxChecked: boolean;
}) => {
  // Persist the permission decision if the user checked "Remember choice"
  if (isPermission && isCheckboxChecked && actionId) {
    aiSettingsStore.setPermissionForActionForActiveProject(
      actionId,
      optionId as ActionPermission,
    );
  }

  aiAssistantStore.respondToInquiry({
    chainType: props.chainType,
    selectedOptionId: optionId,
    // eslint-disable-next-line no-undefined
    suffix: isPermission && isCheckboxChecked ? "Saved" : undefined,
  });
};
</script>

<template>
  <InquiryCard
    :title="props.inquiry.title"
    :description="props.inquiry.description"
    :options="props.inquiry.options"
    :auto-select-after="props.inquiry.timeoutSeconds"
    :default-option-id="props.inquiry.defaultOptionId"
    :checkbox="
      isPermission
        ? {
            label: 'Remember choice',
            subText: 'This will be saved for current workflow',
          }
        : undefined
    "
    @respond="handleRespond"
  />
</template>
