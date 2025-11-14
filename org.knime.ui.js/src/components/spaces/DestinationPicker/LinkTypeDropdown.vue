<script lang="ts" setup>
import { computed, watch } from "vue";

import { Dropdown } from "@knime/components";

import { LinkType } from "@/api/gateway-api/generated-api";
import { buildLinkTypeOptions } from "@/components/common/linkTypeOptions";

import { getDefaultLinkType } from "./getDefaultLinkType";

const props = defineProps<{
  sourceSpaceId: string;
  selectedSpaceId: string;
  modelValue?: LinkType.TypeEnum;
}>();

const defaultLinkType = computed(() =>
  getDefaultLinkType(props.selectedSpaceId),
);

const emit = defineEmits<{ "update:model-value": [id: LinkType.TypeEnum] }>();

const linkTypes = computed(() => {
  if (!props.selectedSpaceId) {
    return [];
  }

  return buildLinkTypeOptions({
    sourceSpaceId: props.sourceSpaceId,
    selectedSpaceId: props.selectedSpaceId,
  }).map((option) => ({
    id: option.id,
    text: option.text,
    slotData: {
      title: option.text,
      subtitle: option.description,
      linkValidity: option.linkValidity,
    },
  }));
});

// set back to default if current selection does not support the type
watch(
  linkTypes,
  (newValue) => {
    const foundInNewValue = newValue.find(
      (type) => type.id === props.modelValue,
    );
    if (!foundInNewValue) {
      emit("update:model-value", defaultLinkType.value);
    }
  },
  { immediate: true },
);
</script>

<template>
  <!-- @vue-expect-error aria-label is there but TS still complains -->
  <Dropdown
    :possible-values="linkTypes"
    direction="up"
    :model-value="modelValue"
    aria-label="Choose shared component link type"
    @update:model-value="emit('update:model-value', $event as LinkType.TypeEnum)"
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
