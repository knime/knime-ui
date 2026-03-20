<script setup lang="ts">
import { computed } from "vue";

import { ComboBox, TagList } from "@knime/components";

import SidebarPanelSubHeading from "../common/side-panel/SidebarPanelSubHeading.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  modelValue: Array<string>;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  editable: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", tags: Array<string>): void;
}>();

const currentTags = computed(() =>
  props.modelValue.map((tag) => ({
    id: tag,
    text: tag,
  })),
);

const selectedIds = computed(() => currentTags.value.map(({ id }) => id));

const onTagsChange = (tags: Array<string | number | symbol>) => {
  emit(
    "update:modelValue",
    tags.map((tag) => tag.toString()),
  );
};
</script>

<template>
  <div :class="['tags', { editable }]">
    <SidebarPanelSubHeading>Tags</SidebarPanelSubHeading>

    <template v-if="!editable">
      <TagList v-if="modelValue.length" :tags="modelValue" />
      <MetadataPlaceholder v-else padded text="No tags have been set yet" />
    </template>

    <template v-else>
      <ComboBox
        :possible-values="currentTags"
        :model-value="selectedIds"
        :size-visible-options="3"
        :max-characters-per-item="$characterLimits.metadata.tags"
        allow-new-values
        class="tag-editor"
        @update:model-value="onTagsChange"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.tags {
  & ul {
    display: flex;
    flex-wrap: wrap;
    padding: 0;
    list-style: none;

    & li {
      padding: 2px 6px;
      margin-right: 5px;
      margin-bottom: 10px;
      font-size: 14px;
      line-height: 21px;
      background-color: var(--knime-white);
      border: 1px solid var(--knime-masala);
    }
  }
}
</style>
