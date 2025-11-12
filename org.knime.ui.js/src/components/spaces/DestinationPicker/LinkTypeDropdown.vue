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
          "Creates a link to the shared component using the full, fixed path of the shared component.",
        linkValidity:
          "The link may break if the shared component is moved to a different location.",
      },
    },
    ...valueOrEmpty(isSameSpace, {
      id: ShareComponentCommand.LinkTypeEnum.SPACERELATIVE,
      text: "Create space-relative link",
      slotData: {
        title: "Create space-relative link",
        subtitle:
          "Creates a link to the shared component relative to the space where the shared component is stored.",
        linkValidity:
          "The link remains valid as long as the workflow and the shared component stay in the same space.",
      },
    }),
    ...valueOrEmpty(isSameSpace, {
      id: ShareComponentCommand.LinkTypeEnum.WORKFLOWRELATIVE,
      text: "Create workflow-relative link",
      slotData: {
        title: "Create workflow-relative link",
        subtitle:
          "Creates a link to the shared component relative to the location of the workflow.",
        linkValidity:
          "The link remains valid if the relative folder structure between the workflow and the shared component does not change.",
      },
    }),
    ...valueOrEmpty(!isLocal, {
      id: ShareComponentCommand.LinkTypeEnum.MOUNTPOINTABSOLUTEIDBASED,
      text: "Create ID-based absolute link",
      slotData: {
        title: "Create ID-based absolute link",
        subtitle:
          "Creates a link to the shared component using the shared component unique Hub identifier.",
        linkValidity:
          "The link remains valid even if the component is moved or renamed on the Hub.",
      },
    }),
    {
      id: "NONE",
      text: "Do not create link",
      slotData: {
        title: "Do not create link",
        subtitle:
          "Saves the shared component but keeps a stand-alone copy in the workflow.",
        linkValidity:
          "The component is not linked and will not receive updates if the shared component changes.",
      },
    },
    // MOUNTPOINT_RELATIVE === SPACE_RELATIVE
    // NODE_RELATIVE - not available in classic either
  ];
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
    @update:model-value="
      emit('update:model-value', $event as ShareComponentCommand.LinkTypeEnum)
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
