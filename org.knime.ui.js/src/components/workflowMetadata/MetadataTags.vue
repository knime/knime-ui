<script setup lang="ts">
import { computed } from "vue";
import TagList from "webapps-common/ui/components/TagList.vue";
import ComboBox from "webapps-common/ui/components/forms/ComboBox.vue";

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

const onTagsChange = (tags: Array<string>) => {
  emit("update:modelValue", tags);
};
</script>

<template>
  <div :class="['tags', { editable }]">
    <h2 :class="['section', { form: editable }]">Tags</h2>

    <template v-if="!editable">
      <TagList v-if="modelValue.length" :tags="modelValue" />
      <MetadataPlaceholder v-else padded text="No tags have been set yet" />
    </template>

    <template v-else>
      <ComboBox
        :possible-values="currentTags"
        :model-value="selectedIds"
        :size-visible-options="3"
        allow-new-values
        class="tag-editor"
        @update:model-value="onTagsChange"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.tags {
  & .wrapper {
    padding: 13px 0;
  }

  & ul {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    padding: 0;

    & li {
      border: 1px solid var(--knime-masala);
      padding: 2px 6px;
      font-size: 14px;
      line-height: 21px;
      margin-bottom: 10px;
      margin-right: 5px;
      background-color: var(--knime-white);
    }
  }
}
</style>
