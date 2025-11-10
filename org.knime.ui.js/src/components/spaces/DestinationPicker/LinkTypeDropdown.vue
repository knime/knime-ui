<script lang="ts" setup>
import { computed, watch } from "vue";

import { Dropdown } from "@knime/components";

import { ShareComponentCommand } from "@/api/gateway-api/generated-api";
import { localRootProjectPath } from "@/store/spaces/caching";
import { valueOrEmpty } from "@/util/valueOrEmpty";

import { getDefaultLinkType } from "./getDefaultLinkType";

const props = defineProps<{
  sourceSpaceId: string;
  selectedSpaceId: string;
  modelValue?: ShareComponentCommand.LinkTypeEnum;
}>();

const defaultLinkType = computed(() =>
  getDefaultLinkType(props.selectedSpaceId),
);

const emit = defineEmits<{
  "update:model-value": [id: ShareComponentCommand.LinkTypeEnum];
}>();

const linkTypes = computed(() => {
  if (!props.selectedSpaceId) {
    return [];
  }
  const isLocal = props.selectedSpaceId === localRootProjectPath.spaceId;
  const isSameSpace = props.selectedSpaceId === props.sourceSpaceId;

  return [
    {
      id: ShareComponentCommand.LinkTypeEnum.MOUNTPOINTABSOLUTE,
      text: "Create absolute link",
      slotData: {
        title: "Create absolute link",
        subtitle:
          "If you move the workflow to a new location it will always link back to the component at its current location.",
      },
    },
    ...valueOrEmpty(!isLocal, {
      id: ShareComponentCommand.LinkTypeEnum.MOUNTPOINTABSOLUTEIDBASED,
      text: "Create ID-based absolute link",
      slotData: {
        title: "Create ID-based absolute link",
        subtitle:
          "If you move the workflow, it will still link to its shared component using the component’s Hub ID.",
      },
    }),
    ...valueOrEmpty(isSameSpace, {
      id: ShareComponentCommand.LinkTypeEnum.SPACERELATIVE,
      text: "Create space-relative link",
      slotData: {
        title: "Create space-relative link",
        subtitle:
          "If you move the workflow, the shared component must exist in the same path relative to that space’s root.",
      },
    }),
    ...valueOrEmpty(isSameSpace, {
      id: ShareComponentCommand.LinkTypeEnum.WORKFLOWRELATIVE,
      text: "Create workflow-relative link",
      slotData: {
        title: "Create workflow-relative link",
        subtitle: "Workflow and Component should always be moved together.",
      },
    }),
  ];
});

// set back to default if current selection does not support the type
watch(linkTypes, (newValue) => {
  const foundInNewValue = newValue.find((type) => type.id === props.modelValue);
  if (!foundInNewValue) {
    emit("update:model-value", defaultLinkType.value);
  }
});
</script>

<template>
  <Dropdown
    :possible-values="linkTypes"
    :model-value="modelValue"
    aria-label="Choose shared component link type"
    @update:model-value="
      emit('update:model-value', $event as ShareComponentCommand.LinkTypeEnum)
    "
  >
    <template
      #option="{ slotData: { title, subtitle } } = {
        slotData: {},
      }"
    >
      <div class="slot-option">
        <div class="description">
          <div class="title">{{ title }}</div>
          <div class="subtitle">{{ subtitle }}</div>
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
