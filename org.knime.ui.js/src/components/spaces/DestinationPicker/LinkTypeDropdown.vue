<script lang="ts" setup>
import { computed, onMounted, watch } from "vue";

import { Dropdown } from "@knime/components";

import { localRootProjectPath } from "@/store/spaces/caching";
import { valueOrEmpty } from "@/util/valueOrEmpty";

const DEFAULT_LINK_TYPE_LOCAL = "MOUNTPOINT_ABSOLUTE_PATH";
const DEFAULT_LINK_TYPE_REMOTE = "MOUNTPOINT_ABSOLUTE_ID";

const {
  selectedSpaceId,
  // eslint-disable-next-line no-undefined
  modelValue = undefined,
  sourceSpaceId,
} = defineProps<{
  sourceSpaceId: string;
  selectedSpaceId: string;
  modelValue?: string;
}>();

const isLocal = computed(
  () => selectedSpaceId === localRootProjectPath.spaceId,
);

const defaultLinkType = computed(() =>
  isLocal.value ? DEFAULT_LINK_TYPE_LOCAL : DEFAULT_LINK_TYPE_REMOTE,
);

const emit = defineEmits<{
  "update:model-value": [id: string];
}>();

// Emit default value immediately if no modelValue is provided
// This is to return a value from the destination picker even if
// the dropdown has not yet been revealed from "Show advanced settings"
if (!modelValue) {
  emit("update:model-value", defaultLinkType.value);
}

onMounted(() => {
  // Ensure default is set on mount as well (for cases where computed changes)
  if (!modelValue) {
    emit("update:model-value", defaultLinkType.value);
  }
});

const linkTypes = computed(() => {
  if (!selectedSpaceId) {
    return [];
  }

  const isSameSpace = selectedSpaceId === sourceSpaceId;

  return [
    {
      id: "MOUNTPOINT_ABSOLUTE_PATH",
      text: "Create absolute link",
      slotData: {
        title: "Create absolute link",
        subtitle:
          "If you move the workflow to a new location it will always link back to the component at its current location.",
      },
    },
    ...valueOrEmpty(!isLocal.value, {
      id: "MOUNTPOINT_ABSOLUTE_ID",
      text: "Create ID-based absolute link",
      slotData: {
        title: "Create ID-based absolute link",
        subtitle:
          "If you move the workflow, it will still link to its shared component using the component’s Hub ID.",
      },
    }),
    ...valueOrEmpty(isSameSpace, {
      id: "SPACE_RELATIVE",
      text: "Create space-relative link",
      slotData: {
        title: "Create space-relative link",
        subtitle:
          "If you move the workflow, the shared component must exist in the same path relative to that space’s root.",
      },
    }),
    ...valueOrEmpty(isSameSpace, {
      id: "WORKFLOW_RELATIVE",
      text: "Create workflow-relative link",
      slotData: {
        title: "Create workflow-relative link",
        subtitle: "Workflow and Component should always be moved together.",
      },
    }),
    // MOUNTPOINT_RELATIVE === SPACE_RELATIVE
    // NODE_RELATIVE - not available in classic either
  ];
});

// set back to default if current selection does not support the type
watch(linkTypes, (newValue) => {
  const foundInNewValue = newValue.find((type) => type.id === modelValue);
  if (!foundInNewValue) {
    emit("update:model-value", defaultLinkType.value);
  }
});
</script>

<template>
  <Dropdown
    :possible-values="linkTypes"
    aria-label="Link type dropdown"
    :model-value="modelValue"
    @update:model-value="(id: string) => emit('update:model-value', String(id))"
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
