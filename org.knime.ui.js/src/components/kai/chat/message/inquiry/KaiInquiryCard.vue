<script setup lang="ts">
import { type Component, computed } from "vue";

import {
  KaiInquiry,
  type KaiInquiry as KaiInquiryType,
} from "@/api/gateway-api/generated-api";
import type { ChainType } from "@/store/ai/types";

import MultiChoiceInquiryCard from "./MultiChoiceInquiryCard.vue";
import PermissionInquiryCard from "./PermissionInquiryCard.vue";
import SingleChoiceInquiryCard from "./SingleChoiceInquiryCard.vue";

type Props = {
  inquiry: KaiInquiryType;
  chainType: ChainType;
};

const props = defineProps<Props>();

const getInquiryComponent = (
  inquiryType: KaiInquiry.InquiryTypeEnum,
): Component => {
  switch (inquiryType) {
    case KaiInquiry.InquiryTypeEnum.SingleChoice:
      return SingleChoiceInquiryCard;
    case KaiInquiry.InquiryTypeEnum.MultipleChoice:
      return MultiChoiceInquiryCard;
    case KaiInquiry.InquiryTypeEnum.Permission:
      return PermissionInquiryCard;
    default:
      throw new Error(`Unsupported inquiry type: ${inquiryType}`);
  }
};

const inquiryComponent = computed(() =>
  getInquiryComponent(props.inquiry.inquiryType),
);
</script>

<template>
  <component
    :is="inquiryComponent"
    :inquiry="props.inquiry"
    :chain-type="props.chainType"
  />
</template>
