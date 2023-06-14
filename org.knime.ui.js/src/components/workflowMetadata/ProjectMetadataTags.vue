<script setup lang="ts">
import { computed } from "vue";
import TagList from "webapps-common/ui/components/TagList.vue";
import ComboBox from "webapps-common/ui/components/forms/ComboBox.vue";

import MetadataPlaceholder from "./MetadataPlaceholder.vue";

interface Props {
  tags?: Array<string>;
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  tags: () => [],
  editable: false,
});

const emit = defineEmits<{
  (e: "change", tags: Array<string>): void;
}>();

const currentTags = computed(() =>
  props.tags.map((tag) => ({
    id: tag,
    text: tag,
  }))
);

const initialSelectedIds = computed(() =>
  currentTags.value.map(({ id }) => id)
);
</script>

<template>
  <div class="tags">
    <h2>Tags</h2>
    <template v-if="!editable">
      <hr />
      <TagList v-if="tags.length" :tags="tags" />
      <MetadataPlaceholder v-else padded text="No tags have been set yet" />
    </template>

    <template v-else>
      <ComboBox
        :possible-values="currentTags"
        :initial-selected-ids="initialSelectedIds"
        :size-visible-options="3"
        @update:selected-ids="emit('change', $event)"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
h2 {
  margin: 0;
  font-weight: 400;
  font-size: 18px;
  line-height: 36px;
}

hr {
  border: none;
  border-top: 1px solid var(--knime-silver-sand);
  margin: 0;
}

.tags {
  padding-top: 5px;

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
