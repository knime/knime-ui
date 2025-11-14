<!-- eslint-disable no-undefined -->
<script lang="ts" setup>
import { computed, watch } from "vue";

import { Dropdown } from "@knime/components";

import { LinkVariant } from "@/api/gateway-api/generated-api";
import type { LinkVariantInfo } from "@/api/gateway-api/generated-api";

import { getDefaultLinkVariant } from "./getDefaultLinkVariant";

const props = defineProps<{
  selectedSpaceId: string;
  linkVariants: LinkVariantInfo[];
  modelValue?: LinkVariant.VariantEnum;
}>();

const defaultLinkVariant = computed(() =>
  getDefaultLinkVariant(props.selectedSpaceId),
);

const emit = defineEmits<{
  "update:model-value": [id: LinkVariant.VariantEnum];
}>();

type DropdownOption = {
  id: LinkVariant.VariantEnum;
  text: string;
  slotData: {
    title: string;
    subtitle: string;
    linkValidity: string;
  };
};

const linkVariants = computed<DropdownOption[]>(() =>
  props.linkVariants
    .map((variantInfo) => {
      const variant = variantInfo?.variant?.variant;
      if (!variant) {
        return null;
      }

      return {
        id: variant,
        text: variantInfo.title,
        slotData: {
          title: variantInfo.title,
          subtitle: variantInfo.description,
          linkValidity: variantInfo.linkValidity,
        },
      };
    })
    .filter((variant): variant is DropdownOption => variant !== null),
);

// set back to default if current selection does not support the type
watch(
  linkVariants,
  (newValue) => {
    if (!newValue.length) {
      return;
    }

    const isAlreadySet = newValue.find((type) => type.id === props.modelValue);

    if (isAlreadySet) {
      return;
    }

    const preferredDefault = newValue.find(
      (type) => type.id === defaultLinkVariant.value,
    );

    const fallbackId = preferredDefault?.id ?? newValue[0].id;

    emit("update:model-value", fallbackId);
  },
  { immediate: true },
);
</script>

<template>
  <!-- @vue-expect-error aria-label is there but TS still complains -->
  <Dropdown
    :possible-values="linkVariants"
    direction="up"
    :model-value="modelValue"
    aria-label="Choose shared component link type"
    @update:model-value="
      emit('update:model-value', $event as LinkVariant.VariantEnum)
    "
  >
    <template
      #option="{ slotData } = {
        slotData: {},
      }"
    >
      <div class="slot-option">
        <div class="description">
          <div class="title">{{ slotData?.title }}</div>
          <div class="subtitle">{{ slotData?.subtitle }}</div>
          <div class="subtitle">{{ slotData?.linkValidity }}</div>
        </div>
      </div>
    </template>
  </Dropdown>
</template>

<style lang="postcss">
.slot-option {
  display: flex;
  padding: var(--space-8);

  & .description {
    flex: 1 1 auto;
    width: 100%;

    & .title {
      font-size: 13px;
      font-weight: 500;
      line-height: 150%;
    }

    & .subtitle {
      font-size: 10px;
      font-weight: 300;
      line-height: 150%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
